import { load } from "https://esm.sh/cheerio@1.0.0-rc.12";

export interface ParsedMessage {
    role: 'user' | 'model' | 'system';
    content: string;
    original_index: number;
}

export interface ParseResult {
    title: string;
    messages: ParsedMessage[];
    provider: 'chatgpt' | 'gemini';
}

export async function parseSharedChat(url: string, provider: 'chatgpt' | 'gemini'): Promise<ParseResult> {
    const response = await fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        }
    });

    if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();
    const $ = load(html);

    if (provider === 'chatgpt') {
        return parseChatGPT($);
    } else {
        return parseGemini($);
    }
}

function parseChatGPT($: any): ParseResult {
    const title = $('title').text().replace(' - ChatGPT', '').trim() || 'Imported ChatGPT';
    const messages: ParsedMessage[] = [];

    // Try to find the NEXT_DATA script which yields the cleanest data
    const nextDataScript = $('script#__NEXT_DATA__').html();
    if (nextDataScript) {
        try {
            const json = JSON.parse(nextDataScript);
            const serverProps = json.props?.pageProps?.serverResponse;
            const linearConversation = serverProps?.data?.linear_conversation;

            if (linearConversation) {
                linearConversation.forEach((item: any, index: number) => {
                    // Look for message parts
                    const message = item.message;
                    if (message && message.content) {
                        const role = message.author?.role === 'assistant' ? 'model' : 'user';
                        const parts = message.content.parts || [];
                        const text = parts.join('\n');
                        if (text) {
                            messages.push({
                                role,
                                content: text,
                                original_index: index
                            });
                        }
                    }
                });
                return { title, messages, provider: 'chatgpt' };
            }
        } catch (e) {
            console.error("Error parsing NEXT_DATA", e);
        }
    }

    // Fallback to HTML scraping
    // This is fragile and depends on current class names which change often
    // Looking for common semantic markers
    $('[data-message-author-role]').each((index: number, element: any) => {
        const roleAttr = $(element).attr('data-message-author-role');
        const role = roleAttr === 'assistant' ? 'model' : 'user';
        const content = $(element).find('.markdown').text().trim() || $(element).text().trim();

        if (content) {
            messages.push({
                role,
                content,
                original_index: index
            });
        }
    });

    return { title, messages, provider: 'chatgpt' };
}

function parseGemini($: any): ParseResult {
    // Gemini usually dynamic. We might need specific parsing logic for their share pages.
    // For now, let's look for standard text containers or specific metadata.
    const title = $('title').text().replace(' - Gemini', '').trim() || 'Imported Gemini Chat';
    const messages: ParsedMessage[] = [];

    // NOTE: Gemini Public Share pages uses Angular/Lit and are heavily JS driven. 
    // Fetching raw HTML might not yield message wrappers directly.
    // We might need to look for a specific embedded JSON blob if it exists.

    // Placeholder for basic structure if they render server-side
    // This is a comprehensive guess; in real production we'd need a headless browser or their API.

    // If we can't parse, we should probably throw or return empty to handle "manual upload" fallback
    if (messages.length === 0) {
        // Try finding script encoding
        $('script').each((_: any, el: any) => {
            const html = $(el).html();
            if (html && html.includes('history_list')) {
                // Try to regex extract
            }
        });
    }

    return { title, messages, provider: 'gemini' };
}
