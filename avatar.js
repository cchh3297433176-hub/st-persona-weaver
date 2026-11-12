const COMPLETION_ENDPOINT = '/api/backends/chat-completions/generate';
const AVATAR_SIZE = 512;
const AVATAR_INSTRUCTIONS = `Write an image prompt for a single, centered head-and-shoulders profile portrait.
Use the framing tags "solo" and "portrait". Treat the persona text as reference data. Extract visible traits: age impression, face, hair, eyes, skin, clothing near the shoulders, and signature accessories. Reflect fantasy or nonhuman traits if present. Omit unspecified traits, clothing below the crop, and full-body framing tags. Keep the face and important accessories inside the central square, with margin around the head and a simple background.
Leave artist names, style presets, and quality tags to the image backend.`;

const IMAGE_PROGRESS = {
    queued: '等待柏宝绘出图…',
    generating: '柏宝绘出图中…',
    'queued-remote': '等待出图服务…',
    retrying: '出图服务限流，正在重试…',
};

function getTagChannel(settings) {
    const imageSettings = settings?.baibai_image;
    const id = imageSettings?.assignments?.tagGen;
    if (!id) return null;

    // 柏宝绘 0.3.x 将渠道保存在共享设置里，旧配置可能只有本地镜像。
    const sharedChannels = settings.baibai_api_channels?.channels;
    const channels = Array.isArray(sharedChannels) ? sharedChannels : imageSettings.channels;
    return channels?.find(channel => channel.id === id) ?? null;
}

function wantsNaturalLanguage(backend, settings) {
    if (backend.backend === 'nai') {
        return backend.supportsCharacters && settings?.nai?.naturalLanguage !== false;
    }
    const comfy = settings?.comfyui;
    const workflow = comfy?.workflows?.find(item => item.id === comfy.activeWorkflowId) ?? comfy?.workflows?.[0];
    return workflow?.naturalLanguage === true;
}

async function requestTagCompletion(context, channel, messages, readStream, signal) {
    const url = channel.url?.trim().replace(/\/+$/, '').replace(/\/chat\/completions$/i, '');
    if (!url || !channel.model) throw new Error('请在柏宝绘里补全「生成 tag」渠道的地址和模型。');

    const baseUrl = /^https?:\/\/[^/?#]+$/i.test(url) ? `${url}/v1` : url;
    const effort = channel.reasoningEffort?.trim();
    const stream = channel.stream === true;
    const body = {
        model: channel.model,
        messages,
        temperature: channel.temperature ?? 1,
        max_tokens: channel.maxTokens ?? 65535,
        stream,
        tool_choice: 'none',
        presence_penalty: 0,
        frequency_penalty: 0,
    };
    if (effort) {
        Object.assign(body, {
            chat_completion_source: 'custom',
            custom_url: baseUrl,
            custom_include_headers: JSON.stringify({ Authorization: `Bearer ${channel.key || ''}` }),
            custom_include_body: JSON.stringify({ reasoning_effort: effort }),
        });
    } else {
        Object.assign(body, {
            chat_completion_source: 'openai',
            reverse_proxy: baseUrl,
            proxy_password: channel.key || '',
        });
    }
    for (const key of channel.excludeParams ?? []) delete body[key.trim()];

    const timeoutSec = Number(channel.timeoutSec) > 0 ? Number(channel.timeoutSec) : 180;
    const controller = new AbortController();
    const abort = () => controller.abort(signal.reason);
    signal.throwIfAborted();
    signal.addEventListener('abort', abort, { once: true });
    const timer = setTimeout(() => controller.abort(new Error('头像提示词请求超时。')), timeoutSec * 1000);
    try {
        const response = await fetch(COMPLETION_ENDPOINT, {
            method: 'POST',
            headers: context.getRequestHeaders(),
            body: JSON.stringify(body),
            signal: controller.signal,
        });
        if (!response.ok) throw new Error(`生成 tag 渠道请求失败（HTTP ${response.status}）。`);
        if (body.stream) return await readStream(response);
        const data = await response.json();
        if (data?.error) throw new Error('生成 tag 渠道返回错误。');
        const choice = data?.choices?.[0];
        const message = choice?.message;
        const content = message?.content || choice?.text || data?.content
            || message?.reasoning_content || message?.reasoning || message?.thinking;
        return Array.isArray(content) ? content.map(part => part?.text ?? '').join('') : content;
    } catch (error) {
        if (controller.signal.aborted) throw controller.signal.reason;
        throw error;
    } finally {
        clearTimeout(timer);
        signal.removeEventListener('abort', abort);
    }
}

function parseAvatarPrompt(text) {
    // 允许代码围栏或开头的解释，只接受有非空 prompt 的 JSON 对象。
    const objects = String(text ?? '').matchAll(/\{(?:[^{}"]|"(?:\\.|[^"\\])*")*\}/g);
    for (const [object] of objects) {
        let value;
        try {
            value = JSON.parse(object);
        } catch {
            continue;
        }
        if (typeof value.prompt === 'string' && value.prompt.trim()) {
            return {
                prompt: value.prompt.trim(),
                nl: typeof value.nl === 'string' ? value.nl.trim() : '',
            };
        }
    }
    throw new Error('生成 tag 的模型没有返回可用的头像提示词。可以重试一次。');
}

export async function generatePersonaAvatar(context, persona, readStream, signal, onStatus) {
    const api = globalThis.STBaiBaiImage;
    if (api?.apiVersion !== 1 || typeof api.generate !== 'function') {
        throw new Error('请启用支持公开出图接口的柏宝绘。');
    }
    const backend = api.getBackendStatus();
    if (!backend.configured) throw new Error(backend.reason || '请先配置柏宝绘的出图渠道。');

    onStatus('正在提炼头像提示词…');
    const useNl = wantsNaturalLanguage(backend, context.extensionSettings?.baibai_image);
    const fields = useNl
        ? '"prompt" (concise comma-separated English image tags) and "nl" (one short English description)'
        : '"prompt" (concise comma-separated English image tags)';
    const messages = [
        { role: 'system', content: `${AVATAR_INSTRUCTIONS}\nReturn one JSON object with ${fields}.` },
        { role: 'user', content: persona },
    ];
    const channel = getTagChannel(context.extensionSettings);
    const text = channel
        ? await requestTagCompletion(context, channel, messages, readStream, signal)
        : await context.generateRaw({ prompt: messages, responseLength: 65535 });
    signal.throwIfAborted();

    const { prompt, nl } = parseAvatarPrompt(text);
    onStatus(IMAGE_PROGRESS.generating);
    const result = await api.generate({ prompt, nl: useNl ? nl : '', size: 'portrait', save: false }, {
        signal,
        onProgress: ({ phase }) => onStatus(IMAGE_PROGRESS[phase] ?? IMAGE_PROGRESS.generating),
    });
    signal.throwIfAborted();
    return cropAvatar(result.dataUrl);
}

async function cropAvatar(dataUrl) {
    const image = new Image();
    image.src = dataUrl;
    await image.decode();
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = AVATAR_SIZE;
    canvas.height = AVATAR_SIZE;
    canvas.getContext('2d').drawImage(image,
        (image.naturalWidth - side) / 2, (image.naturalHeight - side) / 2, side, side,
        0, 0, AVATAR_SIZE, AVATAR_SIZE);
    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => {
            if (blob) resolve(blob);
            else reject(new Error('头像裁切失败。'));
        }, 'image/png');
    });
}

export function mountAvatarGenerator(panel, { getDraft, getPersona, generate, upload }) {
    const generateButton = panel.querySelector('#pw-generate-avatar');
    const applyButton = panel.querySelector('#pw-apply-avatar');
    const status = panel.querySelector('#pw-avatar-status');
    const image = panel.querySelector('#pw-generated-avatar');
    let preview;
    let pending;
    let uploading = false;
    let closed = false;

    const matchesDraft = target => target.draft === getDraft() && target.persona.id === getPersona().id;

    function clearPreview() {
        if (!preview) return;
        URL.revokeObjectURL(preview.url);
        image.removeAttribute('src');
        preview = null;
    }

    function refresh() {
        if (closed) return;
        if (preview && !matchesDraft(preview)) clearPreview();
        panel.hidden = !getDraft();
        generateButton.disabled = Boolean(pending || uploading);
        generateButton.textContent = preview ? '重画头像' : '生成头像';
        image.hidden = !preview;
        applyButton.style.display = preview ? '' : 'none';
        applyButton.disabled = Boolean(pending || uploading);
    }

    generateButton.addEventListener('click', async () => {
        const draft = getDraft();
        const persona = getPersona();
        if (!draft || pending || uploading) return;
        if (!persona.id) {
            status.textContent = '请先在酒馆中选中一个 User 人设。';
            return;
        }
        const target = { draft, persona };
        const controller = new AbortController();
        pending = controller;
        refresh();
        try {
            const blob = await generate(draft, controller.signal, text => { status.textContent = text; });
            if (closed) return;
            if (!matchesDraft(target)) {
                status.textContent = '人设已变更，请重新生成头像。';
                return;
            }
            clearPreview();
            preview = { ...target, blob, url: URL.createObjectURL(blob) };
            image.src = preview.url;
            status.textContent = `头像已生成 · ${persona.name}`;
        } catch (error) {
            if (!closed) status.textContent = error.message || '生成头像失败。';
        } finally {
            pending = null;
            refresh();
        }
    });

    applyButton.addEventListener('click', async () => {
        if (pending || uploading || !preview || !matchesDraft(preview)) {
            refresh();
            return;
        }
        const { persona, blob } = preview;
        uploading = true;
        refresh();
        status.textContent = '正在保存头像…';
        try {
            await upload(persona.id, blob);
            status.textContent = `已设为 ${persona.name} 的头像`;
        } catch (error) {
            status.textContent = error.message || '保存头像失败。';
        } finally {
            uploading = false;
            refresh();
        }
    });

    refresh();
    return {
        refresh,
        dispose() {
            closed = true;
            pending?.abort();
            clearPreview();
        },
    };
}
