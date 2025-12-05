
import { assertEquals } from "https://deno.land/std@0.168.0/testing/asserts.ts";
import { parseSharedChat } from "../_shared/chatParsers.ts";

// Mock Fetch for testing
const originalFetch = globalThis.fetch;

Deno.test("Parser Test - ChatGPT", async () => {
    globalThis.fetch = async () => new Response(`
        <html>
            <head><title>Test Chat - ChatGPT</title></head>
            <body>
                <script id="__NEXT_DATA__" type="application/json">
                {
                    "props": {
                        "pageProps": {
                            "serverResponse": {
                                "data": {
                                    "linear_conversation": [
                                        { "message": { "author": { "role": "user" }, "content": { "parts": ["Hello AI"] } } },
                                        { "message": { "author": { "role": "assistant" }, "content": { "parts": ["Hello Human"] } } }
                                    ]
                                }
                            }
                        }
                    }
                }
                </script>
            </body>
        </html>
    `);

    const result = await parseSharedChat("https://chatgpt.com/share/test", "chatgpt");

    assertEquals(result.title, "Test Chat");
    assertEquals(result.messages.length, 2);
    assertEquals(result.messages[0].content, "Hello AI");
    assertEquals(result.messages[1].role, "model");

    globalThis.fetch = originalFetch;
});

Deno.test("Parser Test - Fallback HTML", async () => {
    globalThis.fetch = async () => new Response(`
       <html>
           <head><title>Old Chat - ChatGPT</title></head>
           <body>
               <div data-message-author-role="user"><div class="markdown">User says hi</div></div>
               <div data-message-author-role="assistant"><div class="markdown">AI says hello</div></div>
           </body>
       </html>
   `);

    const result = await parseSharedChat("https://chatgpt.com/share/fallback", "chatgpt");
    assertEquals(result.messages.length, 2);
    assertEquals(result.messages[0].content, "User says hi");

    globalThis.fetch = originalFetch;
});
