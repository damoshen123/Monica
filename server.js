import express from 'express';
import http from 'http';
import https from 'https';
import pkg from 'ws';
import path from "path";
import { fileURLToPath } from "url";
import { WebSocketServer } from 'ws';
import cors from 'cors';
import fs from 'fs';
import fsPromises from 'fs/promises';
import os from 'os';
import { createRequire } from 'module';
import EventSource from'eventsource';
import HttpsProxyAgent from 'https-proxy-agent';
import puppeteer from'puppeteer';

// 使用 createRequire 来导入 JSON 文件
const require = createRequire(import.meta.url);
const config = require('./config.json');
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let requestId = null;
let resssss = null;
let Aborted=false;
// 设置本地代理
const proxyUrl = config.proxyUrl;
const proxyAgent = new HttpsProxyAgent(proxyUrl);
const EventEmitter = require('events');
const URL = require('url').URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let browser = null;
let page = null;
let customEventSource;
let  isRestarting;
let  rrreeeqqq;
async function initializeBrowser() {
    try {
        browser = await puppeteer.launch({
            headless: config.wutou,
            args: ['--window-size=800,600'],
            defaultViewport: {
                width: 800,
                height: 600
            }
        });
        page = await browser.newPage();
        function getSessionCookie(cookieString) {
            console.log("cookieString", cookieString)
            var sessionCookie = cookieString.split('; ').map(pair => {
                const [name, value] = pair.split('=');
                return { name, value, domain: 'monica.im', path: '/' };
            });
            return sessionCookie;
        }
        // 设置cookie
        await page.setCookie(...getSessionCookie(config.cookie));
        await page.goto('https://monica.im/home', { waitUntil: 'networkidle0' });
        console.log('Successfully opened https://monica.im/home');
        // 检查是否成功登录
        const isLoggedIn = await page.evaluate(() => {
            return document.querySelector('.icon--SJP_d') !== null;
        });
        console.log('Login status:', isLoggedIn);
        
        const element = await page.$('.monica-btn--TH1fg');
        if (element) {
            await element.click();
            console.log(`Successfully clicked the element with class '.monica-btn--TH1fg"`);
            console.log('欢迎使用Monica反代，成功启动！By从前跟你一样');
        } else {
            console.log(`Element with class "'.monica-btn--TH1fg'" not found`);
            console.log('欢迎使用Monica反代，成功启动！By从前跟你一样');
        }
    } catch (error) {
        console.error('An error occurred during browser initialization:', error);
    }
}
async function restartBrowser() {
    console.log('Restarting browser...');
    isRestarting = true;
    if (browser) {
        await browser.close();
    }
    await initializeBrowser();
    isRestarting = false;
    console.log('Browser restarted successfully');
}
// 初始化浏览器
initializeBrowser();

// 在服务器关闭时关闭浏览器
process.on('SIGINT', async () => {
    if (browser) {
        await browser.close();
    }
    process.exit();
});

const availableModels = [
    { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo" },
    { id: "gpt-4", name: "GPT-4" },
    { id: "claude-v1", name: "Claude v1" },
    { id: "claude-instant-v1", name: "Claude Instant v1" },
    { id: "claude-2", name: "Claude 2" }
];

app.post('/v1/chat/completions', async (req, res) => {
    console.log('Received chat request');
    if(resssss==null){
        resssss = res;
    }
    Aborted = false;

    res.on('close', async () => {
        console.log('Client disconnected');
        Aborted = true;
        if(rrreeeqqq){
        rrreeeqqq.abort();
        resssss=null;
    }
    });

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
    });
    console.log('Received chat request:', req.body);
    await sendMessage(res, req.body);
});

app.get('/v1/models', (req, res) => {
    Aborted = false;
    res.json({
        object: "list",
        data: availableModels.map(model => ({
            id: model.id,
            object: "model",
            created: 1623168000,
            owned_by: "openai",
            permission: [],
            root: model.id,
            parent: null
        })),
    });
    res.on('close', () => {
        console.log('Client disconnected');

    });

});

class CustomEventSource extends EventEmitter {
    constructor(url, options = {}) {
        super();
        this.url = new URL(url);
        this.options = options;
        this.reconnectInterval = 1000;
        this.shouldReconnect = true;
        this.connect();
    }

    connect() {
        const requestOptions = {
            method: this.options.method || 'GET',
            headers: {
                'Cache-Control': 'no-cache',
                'Accept': 'text/event-stream',
                ...this.options.headers
            },
            agent: this.options.agent,
            timeout: this.options.timeout || 0
        };

        const client = this.url.protocol === 'https:' ? https : http;
        rrreeeqqq = client.request(this.url, requestOptions, (res2) => {
            let buffer = '';

            res2.on('data', (chunk) => {
                buffer += chunk;

                const lines = buffer.split('\n');
                buffer = lines.pop();


                lines.forEach(line => {
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        this.emit('message', { data });
                    }
                });
            });

            res2.on('end', () => {
                if (this.shouldReconnect) {
                    this.emit('end', 'Stream ended');
                    setTimeout(() => this.connect(), this.reconnectInterval);
                } else {
                    this.emit('close', 'Connection closed');
                }
            });
        });

        rrreeeqqq.on('error', (error) => {
            this.emit('error', error);
            if (this.shouldReconnect) {
                setTimeout(() => this.connect(), this.reconnectInterval);
            }
        });

        if (this.options.body) {
            rrreeeqqq.write(this.options.body);
        }

        rrreeeqqq.end();
    }

    close() {
        this.shouldReconnect = false;
        if (this.req) {
            this.req.abort();
        }
    }
}

async function sendMessage(res3, message) {
    let isResponseEnded = false;
    try {
        message = message.messages;
        message = JSON.stringify(message);
        console.log('Formatted messages:', message);
        const txtname= Math.random().toString(36).substring(3);
        const localCopyPath = path.join(__dirname, `${txtname+".txt"}`);
        fs.writeFileSync(localCopyPath, message);
        console.log(`Local copy of formatted messages saved to: ${localCopyPath}`);

        // 重置页面状态（可选，视情况而定）
      // await page.reload({ waitUntil: 'networkidle0' });

        // 在适当的地方检查是否已中止


        // 等待并点击所需元素
        await page.waitForSelector('.chat-toolbar-item--at7NB', { timeout: 10000 });
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        const newmasg = await page.$$('.chat-toolbar-item--at7NB');
        if (newmasg) {
            await newmasg[4].click();
            console.log('Successfully clicked the element with class "chat-toolbar-item--at7NB"');
        } else {
            console.log('Element with class "chat-toolbar-item--at7NB" not found');
        }

       // await clickElement('.chat-toolbar-item--at7NB', page);
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        // 上传文件
        await uploadFile('.file-uploader--Aiixn', localCopyPath, page);
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        //删除文件
        fs.unlink(localCopyPath, (err) => {
            if (err) {
              console.error('删除文件时出错:', err);
              return;
            }
            console.log('文件已成功删除');
          });
        // 发送消息
        await clickElement('.input-msg-btn--yXWjh', page);
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        // 设置请求拦截
        await setupRequestInterception(page, res3, () => isResponseEnded = true);

    } catch (error) {
        console.error('Error in sendMessage:', error);
        if (!isResponseEnded) {
            res3.write(`data: [ERROR]\n\n`);
            res3.end();
        }
    }
}

async function clickElement(selector, page) {
    await page.waitForSelector(selector, { timeout: 10000 });
    const element = await page.$(selector);
    if (element) {
        await element.click();
        console.log(`Successfully clicked the element with class "${selector}"`);
    } else {
        console.log(`Element with class "${selector}" not found`);
    }
}

async function uploadFile(selector, filePath, page) {
    // const element = await page.$(selector);
    // if (element) {
    //     console.log(`Successfully found the element with class "${selector}"`);
    //     const [fileChooser] = await Promise.all([
    //         page.waitForFileChooser(),
    //         page.click(selector),
    //     ]);
    //     await fileChooser.accept([filePath]);
    // } else {
    //     console.log(`Element with class "${selector}" not found`);
    // }
    try {
        // 读取文件内容
        const fileContent = await fsPromises.readFile(filePath);
        const fileName = path.basename(filePath);
    
        console.log(`File size: ${fileContent.length} bytes`);
    
        // 获取文件类型
        const fileType = getFileType(fileName);
    
        // 在浏览器中执行文件上传模拟
        await page.evaluate(async ({ fileName, fileContent, fileType }) => {
          // 将 ArrayBuffer 转换为 Uint8Array
          const uint8Array = new Uint8Array(fileContent);
          
          // 将 Uint8Array 转换为 Blob
          const blob = new Blob([uint8Array], { type: fileType });
          
          console.log(`Blob size: ${blob.size} bytes`);
    
          // 创建 File 对象
          const file = new File([blob], fileName, { type: fileType });
          
          console.log(`File size: ${file.size} bytes`);
    
          // 创建 DataTransfer 对象
          const dataTransfer = new DataTransfer();
          dataTransfer.items.add(file);
    
          // 创建拖拽事件
          const createDragEvent = (type) => {
            return new DragEvent(type, {
              bubbles: true,
              cancelable: true,
              dataTransfer: dataTransfer
            });
          };
    
          // 模拟拖拽过程
          const dropZone = document.querySelector('.chat-box--nfsbl') || document.body;
          
          dropZone.dispatchEvent(createDragEvent('dragenter'));
          dropZone.dispatchEvent(createDragEvent('dragover'));
          dropZone.dispatchEvent(createDragEvent('drop'));
    
          console.log('File upload simulation completed for:', fileName);
        }, { fileName, fileContent: Array.from(fileContent), fileType });
    
        console.log('File upload process completed successfully.');
      } catch (error) {
        console.error('Error during file upload:', error);
        throw error;
      }
      
    function getFileType(fileName) {
        const extension = path.extname(fileName).toLowerCase();
        switch (extension) {
          case '.jpg':
          case '.jpeg':
            return 'image/jpeg';
          case '.png':
            return 'image/png';
          case '.gif':
            return 'image/gif';
          case '.pdf':
            return 'application/pdf';
          default:
            return 'application/octet-stream';
        }
      }
    }
    
    



function getFileType(fileName) {
  const extension = path.extname(fileName).toLowerCase();
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.pdf':
      return 'application/pdf';
    default:
      return 'application/octet-stream';
  }
 }

async function setupRequestInterception(page, res4, setResponseEnded) {
    await page.setRequestInterception(true);

    page.on('request', async (request) => {
        if (request.isHandled) return;
        request.isHandled = true;



        if (request.url().includes('/custom_bot/chat')) {
            const newRequest = {
                ...request,
                continue: async (overrides) => {
                    try {
                        if(config.proxy){
                            customEventSource  = new CustomEventSource(request.url(), {
                                method: request.method(),
                                headers: request.headers(),
                                body: request.postData(),
                                agent: proxyAgent,
                                timeout: 30000
                            });
                        }else{
                            customEventSource  = new CustomEventSource(request.url(), {
                                method: request.method(),
                                headers: request.headers(),
                                body: request.postData(),
                                timeout: 30000
                            });
                        }



                        customEventSource.on('message', (event) => {
                            if (Aborted) {
                                console.log('guanbi!!!!');
                                rrreeeqqq.abort();
                                customEventSource.close();
                                return false;
                            }
                            console.log('Received data:', event.data);
                            processStreamData(event.data);
                        });

                        customEventSource.on('error', (error) => {
                            console.error('EventSource error:', error);
                            cleanupAndEnd('Error occurred');
                        });

                        customEventSource.on('end', (message) => {
                            console.log('Stream ended:', message);
                            cleanupAndEnd('Stream ended');
                        });

                        customEventSource.on('close', (message) => {
                            console.log('Connection closed:', message);
                            cleanupAndEnd('Connection closed');
                        });

                        function processStreamData(message) {
                            if (Aborted) {
                                console.log('Request aborted, stopping data processing');
                                rrreeeqqq.abort();
                                return;
                            }

                            console.log('数据', message);
                            if (message == `{"text":"","finished":true}`) {
                                cleanupAndEnd('Finished');
                                customEventSource.close();
                                return;
                            }

                            if (!(message == `{"text":"","extra_flags":{"free_quota_empty":true}}`)) {
                                try {
                                    const parsedMessage = JSON.parse(message);
                                    const text = parsedMessage.text;

                                    const response = {
                                        id: "chatcmpl-" + Math.random().toString(36).substr(2, 9),
                                        object: "chat.completion",
                                        created: Date.now(),
                                        model: "gpt-3.5-turbo-0613",
                                        usage: {
                                            prompt_tokens: 9,
                                            completion_tokens: text.length,
                                            total_tokens: 9 + text.length
                                        },
                                        choices: [
                                            {
                                                delta: {
                                                    role: 'assistant',
                                                    content: text || null
                                                },
                                                finish_reason: null,
                                                index: 0
                                            }
                                        ]
                                    };
                                    if(resssss){
                                        console.log('Sending response:', JSON.stringify(response));
                                        resssss.write(`data: ${JSON.stringify(response).replace("\\n","\\n ")}\n\n`);
                                    }else{
                                        return;
                                    }
                                } catch (error) {
                                    console.error('Error processing message:', error);
                                }
                            }
                        }

                        function cleanupAndEnd(reason) {
                            console.log(`Ending response: ${reason}`);
                            if (customEventSource) {
                                customEventSource.removeAllListeners();
                                customEventSource.close();
                            }
                            rrreeeqqq.abort();
                                resssss.write(`data: [DONE]\n\n`);
                                resssss.end();
                                
                            console.log('Response ended and resources cleaned up');
                        }

                    } catch (error) {
                        console.error('Error intercepting request:', error);
                        cleanupAndEnd('Error occurred');
                    }
                   
        
                },
                
            };

            await newRequest.continue();
        } else {
            await request.continue();
        }
    });
}

server.listen(config.port, () => {
    console.log(`服务器运行在 http://localhost:${config.port}`);
});
