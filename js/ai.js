// AI助手弹窗 —— 直连硅基流动 SiliconFlow（免费、国内可访问、支持浏览器跨域）
// 第一次用会弹窗让你填 API Key，填一次就记住；点右上角 ⚙ 可随时更换

var AI = {};

// API 地址（硅基流动）
AI.apiUrl = 'https://api.siliconflow.cn/v1/chat/completions';
// 免费、快、中文好的模型
AI.model = 'Qwen/Qwen2.5-7B-Instruct';

AI.history = [];
AI.word = null;

// 获取 / 保存 API Key
AI.getKey = function () {
  return (localStorage.getItem('ai_key') || '').trim();
};

AI.saveKey = function (key) {
  localStorage.setItem('ai_key', (key || '').trim());
};

// 打开AI弹窗
AI.show = function (word) {
  if (document.getElementById('ai-box')) {
    AI.close();
  }

  AI.word = word;
  AI.history = [];

  var html = '';
  html = html + '<div class="ai-mask" id="ai-mask"></div>';
  html = html + '<div class="ai-box" id="ai-box">';
  html = html + '  <div class="ai-top">';
  html = html + '    <span>🤖 AI助手</span>';
  html = html + '    <span class="ai-top-btns">';
  html = html + '      <button class="ai-set-btn" title="更换 API Key" onclick="AI.setup()">⚙</button>';
  html = html + '      <button class="ai-close-btn" onclick="AI.close()">✕</button>';
  html = html + '    </span>';
  html = html + '  </div>';
  html = html + '  <div class="ai-chat" id="ai-chat">';
  html = html + '    <div class="ai-bubble ai-bubble-ai">';
  html = html + '      你好！我正在看「<b>' + U.escapeHtml(word.word || '这个词') + '</b>」，有什么想问的尽管说~';
  html = html + '    </div>';
  html = html + '  </div>';
  html = html + '  <div class="ai-bottom">';
  html = html + '    <input class="ai-input" id="ai-input" placeholder="输入你的问题..." autocomplete="off">';
  html = html + '    <button class="ai-send-btn" id="ai-send">发送</button>';
  html = html + '  </div>';
  html = html + '</div>';

  document.body.insertAdjacentHTML('beforeend', html);

  document.getElementById('ai-send').onclick = AI.ask;
  document.getElementById('ai-input').onkeydown = function (e) {
    if (e.key === 'Enter') AI.ask();
  };
  document.getElementById('ai-mask').onclick = AI.close;

  setTimeout(function () {
    var inp = document.getElementById('ai-input');
    if (inp) inp.focus();
  }, 200);
};

// 设置 / 更换 API Key
AI.setup = function () {
  var cur = AI.getKey();
  var key = prompt(
    '请输入硅基流动的 API Key：\n\n' +
    '获取方式：打开 cloud.siliconflow.cn → 注册（免费送额度）\n' +
    '→ 控制台「API 密钥」→ 新建 → 复制粘贴到这里。',
    cur
  );
  if (key === null) return;
  key = (key || '').trim();
  if (!key) {
    AI.saveKey('');
    return;
  }
  AI.saveKey(key);
  AI.addBubble('ai', '✅ 已保存 Key，现在可以提问啦~');
};

// 发消息
AI.ask = async function () {
  var input = document.getElementById('ai-input');
  var sendBtn = document.getElementById('ai-send');
  var text = input.value.trim();
  if (!text) return;

  // 检查 Key
  var key = AI.getKey();
  if (!key) {
    AI.setup();
    key = AI.getKey();
    if (!key) return;
  }

  AI.addBubble('user', text);
  input.value = '';
  sendBtn.disabled = true;
  sendBtn.textContent = '...';

  var loadId = AI.addBubble('ai', '思考中...');

  // 拼词汇上下文，加进系统提示
  var info = '';
  var w = AI.word;
  if (w) {
    if (w.word) info = info + '词语：' + w.word + '\n';
    if (w.pinyin) info = info + '拼音：' + w.pinyin + '\n';
    if (w.definition) info = info + '释义：' + w.definition + '\n';
    if (w.memoryTip) info = info + '记忆方法：' + w.memoryTip + '\n';
    if (w.confusable) info = info + '易混淆辨析：' + w.confusable + '\n';
  }

  var systemMsg = '你是一个中文词汇学习助手，帮用户理解成语和词语。回答要简单、口语化，像朋友聊天。每次控制在200字以内。';
  if (info) {
    systemMsg = systemMsg + '\n\n当前用户学习的词汇：\n' + info;
  }

  var msgs = [{ role: 'system', content: systemMsg }];
  var start = Math.max(0, AI.history.length - 10);
  for (var i = start; i < AI.history.length; i++) {
    msgs.push(AI.history[i]);
  }
  msgs.push({ role: 'user', content: text });

  try {
    var resp = await fetch(AI.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + key,
      },
      body: JSON.stringify({
        model: AI.model,
        messages: msgs,
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    var data;
    try {
      data = await resp.json();
    } catch (e) {
      data = null;
    }

    var loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.remove();

    if (data && data.choices && data.choices[0]) {
      var reply = data.choices[0].message.content;
      AI.history.push({ role: 'user', content: text });
      AI.history.push({ role: 'assistant', content: reply });
      AI.addBubble('ai', reply);
    } else if (resp.status === 401) {
      AI.saveKey('');
      AI.addBubble('ai', 'API Key 无效，已清除。请点右上角 ⚙ 重新填入正确的 Key。');
    } else if (data && data.error) {
      AI.addBubble('ai', '出错了：' + (data.error.message || JSON.stringify(data.error)));
    } else {
      AI.addBubble('ai', '请求失败，请稍后重试');
    }

  } catch (err) {
    var loadEl = document.getElementById(loadId);
    if (loadEl) loadEl.remove();
    AI.addBubble('ai', '网络错误，请检查网络连接');
  }

  sendBtn.disabled = false;
  sendBtn.textContent = '发送';
};

// 添加聊天气泡
AI.addBubble = function (who, text) {
  var chat = document.getElementById('ai-chat');
  if (!chat) return null;
  var id = 'bubble-' + Date.now();
  var cls = who === 'user' ? 'ai-bubble-user' : 'ai-bubble-ai';
  var div = document.createElement('div');
  div.id = id;
  div.className = 'ai-bubble ' + cls;
  div.innerHTML = (text || '').replace(/\n/g, '<br>');
  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
  return id;
};

// 关闭弹窗
AI.close = function () {
  var box = document.getElementById('ai-box');
  var mask = document.getElementById('ai-mask');
  if (box) box.remove();
  if (mask) mask.remove();
  AI.word = null;
  AI.history = [];
};
