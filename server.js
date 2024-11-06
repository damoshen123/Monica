import express from 'express';
import http, { get } from 'http';
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
import axios from 'axios';
import si from 'systeminformation';
import crypto from 'crypto';
import { exec } from 'child_process';
import { promisify } from 'util';
import { chromium } from 'playwright';

//版本号
const banbenhao = "1.3";
const execAsync = promisify(exec);
const CHROME_PATH = path.join(process.cwd(), 'chrome-linux'); // 假设解压到当前目录的 chromium 文件夹
const CHROME_EXECUTABLE = path.join(CHROME_PATH, 'chrome'); // 或 'chrome-linux/chrome'
// 使用 createRequire 来导入 JSON 文件

const require = createRequire(import.meta.url);
const config = require('./config.json');
const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });
let requestId = null;
let resssss = null;
let Aborted=false;
let Message;
let userId;
// 设置本地代理
const proxyUrl = config.proxyUrl;
const proxyAgent = config.proxy ? new HttpsProxyAgent(proxyUrl) : null;
const EventEmitter = require('events');
const URL = require('url').URL;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

let browser = null;
let page = null;
let context=null;
let customEventSource;
let  isRestarting;
let  rrreeeqqq;
let reqmessage="";
let isstream=false;
// Worker 的基础 URL
const baseUrl = 'https://tongji.damoshenworkersdev.workers.dev';


// 创建 axios 实例
const axiosInstance = axios.create({
  baseURL: baseUrl,
  httpsAgent: proxyAgent
});

// 获取版本号
async function getVersion() {
  try {
    const response = await axiosInstance.get('/api/version');
    console.log('Version:', response.data.version);
    return response.data.version;
  } catch (error) {
    console.error('Error fetching version:', error.message);
  }
}

// 记录用户请求
async function recordUserRequest(userId) {
  try {
    const response = await axiosInstance.post('/api/record',
      { userId: userId },
      {
        headers: { 'Content-Type': 'application/json' }
      }
    );
    console.log('Record response:', response.data);
  } catch (error) {
    console.error('Error recording user request:', error.message);
  }
}

// 生成唯一的电脑用户ID
async function generateUniqueUserId() {
    try {
      const [cpu, system, osInfo, uuid] = await Promise.all([
        si.cpu(),
        si.system(),
        si.osInfo(),
        si.uuid()
      ]);
  
      const hardwareInfo = {
        cpuId: cpu.processor_id || '',
        systemUuid: system.uuid || '',
        systemModel: system.model || '',
        osUuid: osInfo.uuid || '',
        machineUuid: uuid.hardware || ''
      };
  
      const combinedInfo = Object.values(hardwareInfo).join('-');
      const hash = crypto.createHash('sha256');
      hash.update(combinedInfo);
      return hash.digest('hex');
    } catch (error) {
      console.error('Error generating unique user ID:', error);
      return 'unknown-' + Date.now();
    }
  }
  

async function initializeBrowser() {
    try {
        // browser = await puppeteer.launch({
        //     headless: config.wutou,
        //     args: ['--window-size=1024,960'],
        //     defaultViewport: {
        //         width: 1024,
        //         height: 1024
        //     }
        // });
        browser = await chromium.launch({
            // 使用系统 Chromium
            executablePath: '/usr/bin/chromium',
            
            // 启动参数
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage'
            ],
                        defaultViewport: {
                width: 1024,
                height: 1024
            },
            
            headless: false  // 无头模式
        });

        // 创建上下文
        context = await browser.newContext({
            viewport: { width: 1920, height: 1080 }
        });

        // 创建页面
       page = await context.newPage();
        console.log("启动浏览器完成");
        // 添加全局错误处理
        process.on('uncaughtException', (error) => {
            console.error('未捕获的异常:', error);
            process.exit(1);
        });
        
        process.on('unhandledRejection', (error) => {
            console.error('未处理的 Promise 拒绝:', error);
            process.exit(1);
        });

        
      //  page = await browser.newPage();

        //console.log("启动浏览器完成");
        function getSessionCookie(cookieString) {
            console.log("cookieString", cookieString)
            var sessionCookie = cookieString.split('; ').map(pair => {
                const [name, value] = pair.split('=');
                return { name, value, domain: '.monica.im', path: '/' };
            });
            return sessionCookie;
        }
        // 设置cookie


        const sessionCookie=getSessionCookie(config.cookie)


                // 设置 cookie


        await context.addCookies(sessionCookie);

        console.log("sessionCookie",sessionCookie);

       // await page.setCookie(...sessionCookie);

        let version =await getVersion();
        console.log(version);

        if(banbenhao == version){

            console.log("最新版本无需更新");

        }else{

            console.log("拥有新版本,请进行更新！");
        }

        userId=await generateUniqueUserId();
        await page.goto('https://monica.im', { waitUntil: 'networkidle0' });
        console.log('Successfully opened https://monica.im');

        // 检查是否成功登录
        try {
            const isLoggedIn = await page.locator('.icon--SJP_d').count() > 0;
            console.log('Login status:', isLoggedIn);
        } catch (error) {
            console.log('Login check failed:', error.message);
        }
        
        const button = page.locator('.monica-btn--TH1fg');
        if (await button.count() > 0) {
            await button.click();
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
    reqmessage="";
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

        let body=req.body
  
    if(!body.hasOwnProperty('stream')||!body["stream"]){


        isstream=false;
    }else{
        isstream=true;
    }
    res.setHeader("Content-Type", "text/event-stream;charset=utf-8");
    res.setHeader("Access-Control-Allow-Origin", "*");
    req.setEncoding("utf8");

    console.log("isstream",isstream)

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
            timeout: 3000//this.options.timeout || 0
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
        message = simplifyJsonString(message)
        function simplifyJsonString(message) {
            try {
              
              // 将每个消息转换为简化的文本格式
              let simplifiedMessages = message.map(msg => {
               
                if(config.tohuman){
                      
                    return `${msg.role.replace("user","human")}: ${msg.content}`;
                }else{

                    return `${msg.role}: ${msg.content}`;
                }
              });
              
              // 将所有简化的消息用换行符连接
              return simplifiedMessages.join('\n');
            } catch (error) {
              console.error("Error parsing JSON:", error);
              return "Error: Invalid JSON string";
            }
          }
          
        console.log('Formatted messages:', message);
        Message = message;
        // 等待并点击所需元素
      //  await page.waitForSelector('.chat-toolbar-item--at7NB', { timeout: 10000 });
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        const newMsgButton = await page.locator('.chat-toolbar-item--at7NB').nth(5);
        console.log('Successfully clicked the element with class "chat-toolbar-item--at7NB"');
        await newMsgButton.click();

       // await clickElement('.chat-toolbar-item--at7NB', page);
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }

    //   await page.evaluate((selector, text) => {
    //     document.querySelector(selector).value = text;
    //     }, '.textarea-primary--YyFEP', Message); 
    //    await new Promise(resolve => setTimeout(resolve, 1000));
    //    await page.type('.textarea-primary--YyFEP', ".", {delay: 0});
        // 输入消息
        const textarea = await page.locator('.textarea-primary--YyFEP');
        await textarea.fill(Message);
        await textarea.type('.');
        // 验证输入
        const inputValue = await textarea.inputValue();
        if (!inputValue || inputValue !== Message + ".") {
            await textarea.fill(Message);
            await textarea.type('.');
        }


        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        await setupRequestInterception(page, res3, () => isResponseEnded = true);
         // 发送消息
         await page.locator('.input-msg-btn--yXWjh').click();
        if (Aborted) {
            console.log('guanbi!!!!');
            rrreeeqqq.abort();
            customEventSource.close();
            return false;
        }
        recordUserRequest(userId);

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
        // Playwright 使用 route 而不是 setRequestInterception
        await page.route('**/*', async (route) => {
            const request = route.request();
            const url = request.url();
            
            if (url.includes('/api/custom_bot/chat')) {
                // 处理 OPTIONS 预检请求
                if (request.method() === 'OPTIONS') {
                    await route.fulfill({
                        status: 200,
                        headers: {
                            'Access-Control-Allow-Origin': 'https://monica.im',
                            'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
                            'Access-Control-Allow-Headers': 'content-type,x-client-id,x-client-locale,x-client-type,x-client-version,x-from-channel,x-product-name,x-time-zone',
                            'Access-Control-Max-Age': '86400',
                            'Access-Control-Allow-Credentials': 'true'
                        }
                    });
                    return;
                }
    
                try {
                    // 创建 EventSource 实例
                    const eventSourceOptions = {
                        method: request.method(),
                        headers: await request.allHeaders(),
                        body: request.postData(),
                        timeout: 30000
                    };
    
                    if (config.proxy) {
                        eventSourceOptions.agent = proxyAgent;
                    }
    
                    customEventSource = new CustomEventSource(url, eventSourceOptions);
    
                    customEventSource.on('message', (event) => {
                        if (Aborted) {
                            console.log('关闭连接!');
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
    
                    // 继续请求
                    await route.continue();
    
                } catch (error) {
                    console.error('Error intercepting request:', error);
                    console.log('Client disconnected');
                    Aborted = true;
                    if (rrreeeqqq) {
                        rrreeeqqq.abort();
                        resssss = null;
                    }
                    await route.continue();
                }
            } else {
                // 对于其他请求，直接继续
                await route.continue();
            }
        });
    
        function processStreamData(message) {
            if (Aborted) {
                console.log('Request aborted, stopping data processing');
                rrreeeqqq.abort();
                return;
            }
    
            console.log('数据', message);
            if (message === `{"text":"","finished":true}`) {
                cleanupAndEnd('Finished');
                customEventSource.close();
                return;
            }
    
            if (message !== `{"text":"","extra_flags":{"free_quota_empty":true}}`) {
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
                        choices: [{
                            delta: {
                                role: 'assistant',
                                content: text || null
                            },
                            finish_reason: null,
                            index: 0
                        }]
                    };
    
                    if (resssss) {
                        console.log('Sending response:', JSON.stringify(response));
                        if (isstream) {
                            reqmessage += text;
                            resssss.write(`data: ${JSON.stringify(response).replace("\\n", "\\n ")}\n\n`);
                        } else {
                            reqmessage += text;
                        }
                    }
                } catch (error) {
                    console.error('Error processing message:', error);
                    console.log('Client disconnected');
                    Aborted = true;
                    if (rrreeeqqq) {
                        rrreeeqqq.abort();
                        resssss = null;
                    }
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
            if (resssss) {
                if (isstream) {
                    if (reqmessage !== "") {
                        resssss.write(`data: [DONE]\n\n`);
                        resssss.end();
                    } else {
                        resssss.write('{"error":{"message":"网络错误","type":"invalid_request_error","param":null,"code":null}}');
                        resssss.end();
                    }
                } else {
                    if (reqmessage !== "") {
                        const response = createChatCompletion(reqmessage);
                        resssss.write(JSON.stringify(response));
                        resssss.end();
                    } else {
                        resssss.write('{"error":{"message":"网络错误","type":"invalid_request_error","param":null,"code":null}}');
                        resssss.end();
                    }
                }
            }
            console.log('Response ended and resources cleaned up');
        }
    }
    

server.listen(config.port, () => {
    console.log(`服务器运行在 http://localhost:${config.port}`);
});
function createChatCompletion(content){
    const completionTokens = content.length;
    
    return {
        id: generateId(),
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: "gpt-3.5-turbo",
        system_fingerprint: "fp_44709d6fcb",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: content
                },
                logprobs: null,
                finish_reason: "stop"
            }
        ],
        usage: {
            prompt_tokens: completionTokens,
            completion_tokens: completionTokens,
            total_tokens: completionTokens
        }
    };
};
const generateId = () => 'chatcmpl-' + Math.random().toString(36).substring(2, 15);