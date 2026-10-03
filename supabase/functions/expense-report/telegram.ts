const TELEGRAM_MESSAGE_LIMIT = 4096;

export class TelegramSendError extends Error {
    definite: boolean;

    constructor(message: string, definite: boolean) {
        super(message);
        this.name = "TelegramSendError";
        this.definite = definite;
    }
}

export async function sendTelegramMessage(input: {
    botToken: string;
    chatId: string;
    messageThreadId: number;
    text: string;
    parseMode?: "HTML";
    // Calendar can opt into one document message for a digest that exceeds the
    // text limit. Existing Finance callers retain their exact sendMessage path.
    overflowDocument?: { filename: string; caption: string; text?: string };
    fetcher?: typeof fetch;
}) {
    const oversized = input.text.length > TELEGRAM_MESSAGE_LIMIT;
    if (oversized && !input.overflowDocument) {
        throw new TelegramSendError(
            `Telegram message exceeds ${TELEGRAM_MESSAGE_LIMIT} characters`,
            true,
        );
    }

    const fetcher = input.fetcher ?? fetch;
    let endpoint = "sendMessage";
    let request: RequestInit = {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: input.chatId,
            message_thread_id: input.messageThreadId,
            text: input.text,
            ...(input.parseMode ? { parse_mode: input.parseMode } : {}),
        }),
    };
    if (oversized && input.overflowDocument) {
        endpoint = "sendDocument";
        const body = new FormData();
        body.set("chat_id", input.chatId);
        body.set("message_thread_id", String(input.messageThreadId));
        body.set("caption", input.overflowDocument.caption);
        body.set(
            "document",
            new Blob([input.overflowDocument.text ?? input.text], { type: "text/plain;charset=utf-8" }),
            input.overflowDocument.filename,
        );
        request = { method: "POST", body };
    }
    let response: Response;
    try {
        response = await fetcher(
            `https://api.telegram.org/bot${input.botToken}/${endpoint}`,
            request,
        );
    } catch {
        throw new TelegramSendError(
            "Telegram request failed before a response was received",
            false,
        );
    }

    let body: {
        ok?: boolean;
        description?: string;
        result?: { message_id?: number };
    };
    try {
        body = await response.json();
    } catch {
        throw new TelegramSendError(
            `Telegram returned an unreadable response (HTTP ${response.status})`,
            false,
        );
    }

    if (!response.ok || body.ok !== true) {
        const description = body.description?.trim() || "Telegram rejected the message";
        throw new TelegramSendError(
            `${description} (HTTP ${response.status})`,
            true,
        );
    }

    const messageId = body.result?.message_id;
    if (typeof messageId !== "number") {
        throw new TelegramSendError(
            "Telegram accepted the request without returning a message_id",
            false,
        );
    }

    return { messageId };
}
