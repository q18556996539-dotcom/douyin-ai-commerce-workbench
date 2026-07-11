"use client";

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";

type Asset = { name: string; url: string; kind: "image" | "frame" | "video" };
type ScriptPlan = { id: number; title: string; badge: string; hook: string; body: string[]; cta: string; score: number };

const stages = ["项目资料", "素材提取", "卖点分析", "剧本选择", "分镜提示词", "导出任务包"];

const defaults = {
  name: "",
  category: "日用百货",
  price: "",
  audience: "抖音女性用户",
  pain: "",
  features: "",
  evidence: "商品图可见",
};

function splitItems(value: string) {
  return value.split(/[，,、\n]/).map((item) => item.trim()).filter(Boolean);
}

export default function Home() {
  const [stage, setStage] = useState(0);
  const [project, setProject] = useState(defaults);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoLink, setVideoLink] = useState("");
  const [scripts, setScripts] = useState<ScriptPlan[]>([]);
  const [selected, setSelected] = useState(0);
  const [notice, setNotice] = useState("项目数据仅保存在当前浏览器");
  const hydrated = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem("douyin-workbench-project");
    if (saved) {
      try { setProject({ ...defaults, ...JSON.parse(saved) }); } catch { /* ignore invalid local data */ }
    }
    hydrated.current = true;
  }, []);

  useEffect(() => {
    if (hydrated.current) localStorage.setItem("douyin-workbench-project", JSON.stringify(project));
  }, [project]);

  const selectedScript = scripts.find((script) => script.id === selected) ?? scripts[0];
  const storyboard = useMemo(() => {
    if (!selectedScript) return [];
    const lines = [selectedScript.hook, ...selectedScript.body, selectedScript.cta];
    return lines.map((line, index) => ({
      id: index + 1,
      time: `${index * 2}-${Math.min((index + 1) * 2, 10)}s`,
      shot: index === 0 ? "近景冲击" : index === lines.length - 1 ? "产品定格" : index % 2 ? "中近景实测" : "细节特写",
      visual: index === 0 ? `0秒展示${project.pain || "核心痛点"}与商品强对比` : index === lines.length - 1 ? `人物手持${project.name || "商品"}，自然指向购买方向` : `用真实动作证明：${splitItems(project.features)[index - 1] || "核心卖点"}`,
      line,
    }));
  }, [selectedScript, project]);

  function update(key: keyof typeof defaults, value: string) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function addImages(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    setAssets((current) => [...current, ...files.map((file) => ({ name: file.name, url: URL.createObjectURL(file), kind: "image" as const }))]);
  }

  function chooseVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
    setAssets((current) => [...current.filter((item) => item.kind !== "video"), { name: file.name, url: URL.createObjectURL(file), kind: "video" }]);
  }

  async function extractFrames() {
    if (!videoFile) {
      setNotice("请先上传本地参考视频；链接解析失败时也需要上传原视频");
      return;
    }
    setNotice("正在浏览器本地抽取关键帧…");
    const source = URL.createObjectURL(videoFile);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.src = source;
    await new Promise<void>((resolve, reject) => { video.onloadedmetadata = () => resolve(); video.onerror = () => reject(new Error("视频读取失败")); });
    const frames: Asset[] = [];
    for (const ratio of [0.08, 0.32, 0.58, 0.84]) {
      video.currentTime = Math.max(0, video.duration * ratio);
      await new Promise<void>((resolve) => { video.onseeked = () => resolve(); });
      const canvas = document.createElement("canvas");
      const scale = Math.min(1, 720 / Math.max(video.videoWidth, 1));
      canvas.width = Math.max(1, Math.round(video.videoWidth * scale));
      canvas.height = Math.max(1, Math.round(video.videoHeight * scale));
      canvas.getContext("2d")?.drawImage(video, 0, 0, canvas.width, canvas.height);
      frames.push({ name: `关键帧 ${Math.round(video.currentTime)}s`, url: canvas.toDataURL("image/jpeg", 0.86), kind: "frame" });
    }
    URL.revokeObjectURL(source);
    setAssets((current) => [...current.filter((item) => item.kind !== "frame"), ...frames]);
    setNotice(`已在本地提取 ${frames.length} 张关键帧，没有上传视频内容`);
    setStage(1);
  }

  function generateScripts() {
    const name = project.name || "这款商品";
    const price = project.price || "当前活动价";
    const pain = project.pain || "很多人每天都在忍受的麻烦";
    const features = splitItems(project.features);
    const f1 = features[0] || "使用方便";
    const f2 = features[1] || "效果明显";
    const f3 = features[2] || "家庭多场景可用";
    setScripts([
      { id: 1, title: "强转化实测型", badge: "推荐", score: 92, hook: `先别划走！${pain}，现场给你看结果。`, body: [`这是${name}，${price}。`, `先看${f1}，不是光靠嘴说。`, `再测${f2}，过程和结果都拍清楚。`], cta: "需要的先去看看，规则确认后再下单。" },
      { id: 2, title: "痛点对比型", badge: "高停留", score: 88, hook: `还在为${pain}反复折腾？`, body: [`普通方法费时又麻烦。`, `${name}重点解决${f1}。`, `${f2}和${f3}一次讲清。`], cta: `先看清规格和价格，合适再入。` },
      { id: 3, title: "生活种草型", badge: "真人感", score: 84, hook: `最近让我省事最多的，就是这个。`, body: [`${name}我用了以后才发现，`, `${f1}是真正每天都能用到的。`, `而且${f2}，${f3}。`], cta: `想少走弯路的，可以先收藏对比。` },
    ]);
    setSelected(1);
    setStage(3);
    setNotice("已按填写资料生成三套本地脚本；发布前仍需核验商品事实");
  }

  function loadSample() {
    setProject({ name: "净浮生油污净", category: "厨房清洁", price: "活动价以商品页为准", audience: "经常做饭、重视清洁效率的家庭用户", pain: "油烟机黄黑重油污难擦", features: "喷出绵密泡沫,溶解重油污,擦后表面干净,厨房多处可用", evidence: "商品图与实测视频可见" });
    setNotice("已载入示例项目，可直接体验完整流程");
  }

  function promptFor(item: (typeof storyboard)[number]) {
    return `9:16竖屏，10秒独立镜头中的${item.time}段落，真实手机拍摄质感。商品：${project.name || "待填写商品"}。景别：${item.shot}。画面：${item.visual}。动作紧凑自然，商品包装与上传素材一致。口播：${item.line}。画面禁止任何字幕、文字贴片、价格水印、时间码、故事板黑框；禁止凭空改变商品外观；只呈现有证据支持的卖点。`;
  }

  async function copyPrompt(text: string) {
    await navigator.clipboard.writeText(text);
    setNotice("提示词已复制，可粘贴到豆包、千问或其他视频模型");
  }

  function exportPackage() {
    if (!selectedScript) { setNotice("请先生成并选择剧本"); return; }
    const content = `# ${project.name || "抖音带货项目"}\n\n## 商品资料\n- 品类：${project.category}\n- 价格口径：${project.price}\n- 目标用户：${project.audience}\n- 核心痛点：${project.pain}\n- 卖点：${project.features}\n- 证据等级：${project.evidence}\n- 参考链接：${videoLink || "无"}\n\n## 已选剧本：${selectedScript.title}\n${[selectedScript.hook, ...selectedScript.body, selectedScript.cta].map((line, i) => `${i + 1}. ${line}`).join("\n")}\n\n## 分镜与视频提示词\n${storyboard.map((item) => `\n### 镜头 ${item.id}｜${item.time}\n- 景别：${item.shot}\n- 画面：${item.visual}\n- 口播：${item.line}\n\n\`\`\`text\n${promptFor(item)}\n\`\`\``).join("\n")}\n\n## 发布前检查\n- [ ] 价格、数量、功效与商品页一致\n- [ ] 每镜仅包含当前镜头台词\n- [ ] 参考图为无黑框、无字幕的纯画面\n- [ ] 未使用无法证明的绝对化卖点\n`;
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `${project.name || "douyin-project"}-生产任务包.md`;
    link.click();
    URL.revokeObjectURL(link.href);
    setNotice("生产任务包已导出");
    setStage(5);
  }

  return (
    <main className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">D</span><div><strong>带货智造台</strong><small>Douyin AI Studio</small></div></div>
        <nav className="side-nav">
          <button className="active"><span>◫</span>视频工作流</button>
          <button><span>▧</span>项目素材库</button>
          <button><span>◇</span>提示词模板</button>
          <button><span>✓</span>质量检查</button>
        </nav>
        <div className="cost-card"><span className="status-dot"/><strong>零 API 费用模式</strong><p>本地处理、手动提交模型</p></div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div><p className="eyebrow">AI COMMERCE WORKFLOW</p><h1>新建带货视频项目</h1></div>
          <div className="top-actions"><button className="ghost" onClick={loadSample}>载入示例</button><button className="primary" onClick={exportPackage}>导出任务包</button></div>
        </header>

        <div className="stepper">
          {stages.map((label, index) => <button key={label} className={index === stage ? "current" : index < stage ? "done" : ""} onClick={() => setStage(index)}><span>{index < stage ? "✓" : index + 1}</span><em>{label}</em></button>)}
        </div>

        <div className="notice"><span>●</span>{notice}</div>

        {stage <= 2 && <div className="content-grid">
          <section className="panel main-panel">
            <div className="panel-title"><div><p>STEP 01</p><h2>商品与目标信息</h2></div><span className="pill">自动保存</span></div>
            <div className="form-grid">
              <label><span>商品名称 *</span><input value={project.name} onChange={(e) => update("name", e.target.value)} placeholder="例如：净浮生油污净" /></label>
              <label><span>商品品类</span><input value={project.category} onChange={(e) => update("category", e.target.value)} /></label>
              <label><span>价格口径</span><input value={project.price} onChange={(e) => update("price", e.target.value)} placeholder="不要填写未经核实的价格" /></label>
              <label><span>目标用户</span><input value={project.audience} onChange={(e) => update("audience", e.target.value)} /></label>
              <label className="wide"><span>用户核心痛点</span><textarea value={project.pain} onChange={(e) => update("pain", e.target.value)} placeholder="只写一个最强痛点，例如：重油污反复擦仍有残留" /></label>
              <label className="wide"><span>可证明卖点</span><textarea value={project.features} onChange={(e) => update("features", e.target.value)} placeholder="用逗号分隔，例如：泡沫覆盖、溶解油污、擦后无残留" /></label>
              <label className="wide"><span>证据来源</span><select value={project.evidence} onChange={(e) => update("evidence", e.target.value)}><option>商品图可见</option><option>商品详情页声明</option><option>实测视频可见</option><option>仅为品类推测，待核验</option></select></label>
            </div>

            <div className="upload-section">
              <div className="section-heading"><h3>上传商品与参考素材</h3><span>{assets.length} 项素材</span></div>
              <div className="upload-grid">
                <label className="dropzone"><input type="file" accept="image/*" multiple onChange={addImages}/><b>＋</b><strong>上传商品图片</strong><small>支持 JPG、PNG，可多选</small></label>
                <label className="dropzone"><input type="file" accept="video/*" onChange={chooseVideo}/><b>▶</b><strong>上传参考视频</strong><small>视频仅在本地浏览器处理</small></label>
              </div>
              <label className="link-field"><span>参考视频链接</span><div><input value={videoLink} onChange={(e) => setVideoLink(e.target.value)} placeholder="粘贴抖音或其他公开视频链接，解析失败时上传原视频"/><button onClick={() => setNotice("链接已记录；免费模式不绕过平台限制自动下载")}>记录</button></div></label>
              <div className="asset-strip">
                {assets.length === 0 ? <p className="empty">素材预览会显示在这里</p> : assets.map((asset, index) => <figure key={`${asset.name}-${index}`}><div>{asset.kind === "video" ? <video src={asset.url} muted/> : <img src={asset.url} alt={asset.name}/>}<span>{asset.kind === "frame" ? "关键帧" : asset.kind === "video" ? "视频" : "商品图"}</span></div><figcaption>{asset.name}</figcaption></figure>)}
              </div>
            </div>
            <div className="panel-actions"><button className="secondary" onClick={extractFrames}>本地提取关键帧</button><button className="primary" onClick={() => setStage(2)}>进入卖点分析</button></div>
          </section>

          <aside className="panel insight-panel">
            <div className="panel-title compact"><div><p>FACT CHECK</p><h2>事实边界</h2></div></div>
            <div className="fact-item green"><b>01</b><div><strong>可直接使用</strong><p>商品图、包装、规格以及实测视频中明确可见的信息。</p></div></div>
            <div className="fact-item yellow"><b>02</b><div><strong>需要标注来源</strong><p>详情页宣称的功效、成分、适用人群与售后规则。</p></div></div>
            <div className="fact-item red"><b>03</b><div><strong>禁止当成事实</strong><p>模型根据品类猜出的卖点、未经核实的最低价和绝对化效果。</p></div></div>
            <div className="score-box"><div><span>资料完整度</span><strong>{Math.min(100, [project.name, project.pain, project.features, project.price].filter(Boolean).length * 20 + Math.min(20, assets.length * 5))}%</strong></div><progress value={[project.name, project.pain, project.features, project.price].filter(Boolean).length * 20 + Math.min(20, assets.length * 5)} max="100"/><p>至少补齐商品名、痛点、卖点和价格口径。</p></div>
            <button className="primary full" onClick={generateScripts}>生成三套剧本</button>
          </aside>
        </div>}

        {stage === 3 && <section className="panel scripts-view">
          <div className="panel-title"><div><p>STEP 04</p><h2>选择一套剧本方向</h2></div><span className="pill">点击卡片选择</span></div>
          <div className="script-grid">{scripts.length ? scripts.map((script) => <button key={script.id} className={`script-card ${selected === script.id ? "selected" : ""}`} onClick={() => setSelected(script.id)}><div className="script-head"><span>{script.badge}</span><b>{script.score}<small>匹配度</small></b></div><h3>{script.title}</h3><p className="hook">“{script.hook}”</p><ol>{script.body.map((line) => <li key={line}>{line}</li>)}</ol><p className="cta">CTA：{script.cta}</p></button>) : <div className="empty-state"><b>还没有剧本</b><p>返回项目资料，填写商品信息后生成。</p></div>}</div>
          <div className="panel-actions"><button className="secondary" onClick={() => setStage(0)}>返回修改资料</button><button className="primary" disabled={!selectedScript} onClick={() => setStage(4)}>确认并生成分镜</button></div>
        </section>}

        {stage >= 4 && <section className="panel storyboard-view">
          <div className="panel-title"><div><p>STEP 05</p><h2>分镜与模型提示词</h2></div><span className="pill">每镜独立可复制</span></div>
          <div className="story-list">{storyboard.map((item) => <article key={item.id} className="story-row"><div className="shot-index"><b>{String(item.id).padStart(2, "0")}</b><span>{item.time}</span></div><div className="shot-content"><div><span>{item.shot}</span><h3>{item.visual}</h3></div><p>口播：{item.line}</p><details><summary>查看完整视频提示词</summary><pre>{promptFor(item)}</pre></details></div><button className="copy" onClick={() => copyPrompt(promptFor(item))}>复制</button></article>)}</div>
          <div className="checklist"><strong>交付前自动检查</strong><span>✓ 每镜仅含当前台词</span><span>✓ 统一 9:16 竖屏</span><span>✓ 禁止字幕与文字贴片</span><span>△ 商品事实仍需人工核验</span></div>
          <div className="panel-actions"><button className="secondary" onClick={() => setStage(3)}>返回选择剧本</button><button className="primary" onClick={exportPackage}>导出完整任务包</button></div>
        </section>}
      </section>
    </main>
  );
}
