const demoRequirement = {
  title: "办公电脑采购项目",
  content:
    "公司因新办公区启用，计划采购100台办公电脑，主要用于日常办公、财务系统和协同办公平台。项目预算60万元，要求30天内完成供货、安装和验收。供应商需具备合法营业执照、三年以上办公设备供货经验，并提供不少于三年的整机质保服务。设备需满足国产主流操作系统兼容要求，支持批量部署和售后上门服务。",
  budget: 600000,
  delivery: "30天",
  supplier: "具备合法营业执照、三年以上办公设备供货经验，提供三年质保服务"
};

const state = {
  currentSection: "announcement",
  currentRecord: null,
  records: loadRecords()
};

const elements = {
  form: document.querySelector("#requirementForm"),
  title: document.querySelector("#title"),
  content: document.querySelector("#content"),
  budget: document.querySelector("#budget"),
  delivery: document.querySelector("#delivery"),
  supplier: document.querySelector("#supplier"),
  loadDemoBtn: document.querySelector("#loadDemoBtn"),
  resetBtn: document.querySelector("#resetBtn"),
  runState: document.querySelector("#runState"),
  flowItems: document.querySelectorAll("#flowList li"),
  structuredOutput: document.querySelector("#structuredOutput"),
  copyParamsBtn: document.querySelector("#copyParamsBtn"),
  documentPreview: document.querySelector("#documentPreview"),
  riskCount: document.querySelector("#riskCount"),
  highRisk: document.querySelector("#highRisk"),
  mediumRisk: document.querySelector("#mediumRisk"),
  lowRisk: document.querySelector("#lowRisk"),
  riskList: document.querySelector("#riskList"),
  regenerateBtn: document.querySelector("#regenerateBtn"),
  adjustBtn: document.querySelector("#adjustBtn"),
  exportBtn: document.querySelector("#exportBtn"),
  clearRecordsBtn: document.querySelector("#clearRecordsBtn"),
  recordTableBody: document.querySelector("#recordTableBody"),
  toast: document.querySelector("#toast")
};

document.addEventListener("DOMContentLoaded", () => {
  createIcons();
  bindEvents();
  renderRecords();
});

function createIcons() {
  document.querySelectorAll("[data-icon]").forEach((item) => {
    item.setAttribute("data-lucide", item.getAttribute("data-icon"));
  });

  if (window.lucide) {
    window.lucide.createIcons();
  }
}

function bindEvents() {
  elements.form.addEventListener("submit", handleGenerate);
  elements.loadDemoBtn.addEventListener("click", loadDemo);
  elements.resetBtn.addEventListener("click", resetWorkspace);
  elements.copyParamsBtn.addEventListener("click", copyStructuredParams);
  elements.regenerateBtn.addEventListener("click", regenerateDocument);
  elements.adjustBtn.addEventListener("click", adjustDocument);
  elements.exportBtn.addEventListener("click", exportWord);
  elements.clearRecordsBtn.addEventListener("click", clearRecords);

  document.querySelectorAll(".nav-item").forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.view));
  });

  document.querySelectorAll(".tab").forEach((button) => {
    button.addEventListener("click", () => {
      state.currentSection = button.dataset.section;
      document.querySelectorAll(".tab").forEach((tab) => tab.classList.remove("active"));
      button.classList.add("active");
      renderDocumentPreview();
    });
  });
}

async function handleGenerate(event) {
  event.preventDefault();

  const requirement = readRequirement();
  const validationMessage = validateRequirement(requirement);
  if (validationMessage) {
    showToast(validationMessage);
    return;
  }

  setControlsDisabled(true);
  resetFlow();
  setRunState("生成中", "running");

  try {
    await runStep("parse", 420);
    const parameters = parseRequirement(requirement);
    elements.structuredOutput.textContent = JSON.stringify(parameters, null, 2);

    await runStep("template", 420);
    const templates = matchTemplates(parameters);

    await runStep("document", 520);
    const document = generateDocument(requirement, parameters, templates);

    await runStep("risk", 420);
    const risks = reviewRisks(requirement, parameters, document);

    const record = createRecord(requirement, parameters, templates, document, risks);
    state.currentRecord = record;
    state.records.unshift(record);
    saveRecords();

    setRunState("生成完成", "success");
    renderDocumentPreview();
    renderRiskReview();
    renderRecords();
    setOutputActions(true);
    showToast("采购文件已生成，并完成合规风险预审");
  } catch (error) {
    setRunState("生成失败", "failed");
    showToast(error.message || "生成失败，请稍后重试");
  } finally {
    setControlsDisabled(false);
  }
}

function readRequirement() {
  return {
    title: elements.title.value.trim(),
    content: elements.content.value.trim(),
    budget: Number(elements.budget.value || 0),
    delivery: elements.delivery.value.trim(),
    supplier: elements.supplier.value.trim()
  };
}

function validateRequirement(requirement) {
  if (!requirement.title) {
    return "采购需求标题必填";
  }

  if (requirement.title.length > 100) {
    return "采购需求标题长度不能超过100";
  }

  if (!requirement.content) {
    return "采购需求内容必填";
  }

  if (requirement.budget < 0) {
    return "预算金额不能小于0";
  }

  return "";
}

function parseRequirement(requirement) {
  const content = requirement.content;
  const budget = requirement.budget || findBudget(content);
  const quantity = findQuantity(content);
  const category = inferCategory(content, requirement.title);
  const delivery = requirement.delivery || findDelivery(content);
  const supplierRequirements = splitRequirements(requirement.supplier || inferSupplier(content));

  return {
    purchaseBackground: inferBackground(content),
    purchaseCategory: category,
    budgetAmount: budget,
    quantity,
    deliveryPeriod: delivery,
    qualificationRequirements: supplierRequirements,
    technicalRequirements: inferTechnicalRequirements(content, category),
    serviceRequirements: inferServiceRequirements(content),
    contractType: category.includes("服务") ? "服务采购合同" : "货物采购合同",
    evaluationMethod: budget >= 500000 ? "综合评分法" : "最低评标价法",
    generatedAt: new Date().toLocaleString("zh-CN")
  };
}

function matchTemplates(parameters) {
  if (!parameters.purchaseCategory) {
    throw new Error("参数解析失败，未识别采购品类");
  }

  return {
    announcement: `${parameters.purchaseCategory}招标公告模板 v2.1`,
    bid: `${parameters.purchaseCategory}招标文件主体模板 v3.0`,
    contract: `${parameters.contractType}条款模板 v2.4`,
    evaluation: `${parameters.evaluationMethod}评审标准模板 v1.8`
  };
}

function generateDocument(requirement, parameters, templates) {
  const budgetText = parameters.budgetAmount ? `${formatMoney(parameters.budgetAmount)}元` : "以招标文件为准";
  const qualificationText = parameters.qualificationRequirements.map((item, index) => `${index + 1}. ${item}`).join("<br />");
  const technicalText = parameters.technicalRequirements.map((item, index) => `${index + 1}. ${item}`).join("<br />");
  const serviceText = parameters.serviceRequirements.map((item, index) => `${index + 1}. ${item}`).join("<br />");

  return {
    announcement: `
      <h4>${requirement.title}招标公告</h4>
      <p>根据采购计划，现对${requirement.title}进行公开采购，欢迎符合条件的供应商参与投标。</p>
      <h5>一、项目概况</h5>
      <p>采购品类：${parameters.purchaseCategory}；采购数量：${parameters.quantity || "以实际需求为准"}；预算金额：${budgetText}；交付周期：${parameters.deliveryPeriod || "合同签订后按约定执行"}。</p>
      <h5>二、供应商资格要求</h5>
      <p>${qualificationText || "供应商应具备独立承担民事责任的能力，并满足招标文件要求。"}</p>
      <h5>三、文件获取与响应</h5>
      <p>供应商应在公告期限内获取招标文件，并按照文件要求提交响应材料。逾期提交或材料不完整的，采购人有权不予受理。</p>
    `,
    bid: `
      <h4>${requirement.title}招标文件主体</h4>
      <h5>一、采购背景</h5>
      <p>${parameters.purchaseBackground}</p>
      <h5>二、采购范围</h5>
      <p>本项目采购范围包括${parameters.purchaseCategory}的供货、安装调试、验收支持、售后服务及相关配套工作。</p>
      <h5>三、技术要求</h5>
      <p>${technicalText}</p>
      <h5>四、服务要求</h5>
      <p>${serviceText}</p>
      <h5>五、投标文件要求</h5>
      <p>投标文件应包括报价文件、资质证明、技术响应、服务方案、交付计划和售后承诺等内容。</p>
    `,
    contract: `
      <h4>${requirement.title}合同条款</h4>
      <h5>一、合同标的</h5>
      <p>乙方按照本合同及招标文件约定，向甲方提供${parameters.purchaseCategory}及相关服务。</p>
      <h5>二、合同金额与付款</h5>
      <p>合同金额以最终中标金额为准。付款应以验收合格、发票合规和资料齐备为前提，具体节点由双方在合同中明确。</p>
      <h5>三、交付与验收</h5>
      <p>乙方应在${parameters.deliveryPeriod || "约定期限"}内完成交付。甲方依据招标文件、投标文件和合同约定组织验收。</p>
      <h5>四、违约责任</h5>
      <p>任何一方违反合同约定，应按照实际损失和合同约定承担相应责任。违约责任设置应遵循公平、合理和对等原则。</p>
      <h5>五、争议解决</h5>
      <p>因合同履行产生争议的，双方应友好协商；协商不成的，可依法向有管辖权的人民法院提起诉讼。</p>
    `,
    evaluation: `
      <h4>${requirement.title}评审标准</h4>
      <h5>一、评审方法</h5>
      <p>本项目建议采用${parameters.evaluationMethod}，从价格、技术响应、服务能力、履约经验和售后保障等方面进行综合评价。</p>
      <h5>二、评分建议</h5>
      <p>价格分：30分；技术响应：35分；服务方案：20分；履约能力：10分；售后保障：5分。</p>
      <h5>三、合规要求</h5>
      <p>评审标准应明确、可量化、可复核，不得设置排斥潜在供应商的地域、品牌或非必要资质条件。</p>
    `
  };
}

function reviewRisks(requirement, parameters, document) {
  const risks = [];
  const content = `${requirement.content} ${document.announcement} ${document.bid} ${document.contract} ${document.evaluation}`;

  if (!content.includes("验收")) {
    risks.push(createRisk("MISSING_CLAUSE", "HIGH", "缺少验收条款", "建议补充验收标准、验收期限和验收不合格处理方式。", "合同条款"));
  }

  if (!content.includes("争议解决")) {
    risks.push(createRisk("MISSING_CLAUSE", "MEDIUM", "缺少争议解决条款", "建议明确协商、诉讼或仲裁等争议解决机制。", "合同条款"));
  }

  if (parameters.budgetAmount && parameters.quantity && parameters.budgetAmount / parameters.quantity < 2500) {
    risks.push(createRisk("BUDGET_ABNORMAL", "MEDIUM", "预算单价可能偏低", "预算金额与采购数量匹配度偏低，建议复核市场价格或调整技术要求。", "预算参数"));
  }

  if (parameters.qualificationRequirements.some((item) => item.includes("三年以上") || item.includes("3年以上"))) {
    risks.push(createRisk("QUALIFICATION_UNREASONABLE", "MEDIUM", "供应商经验要求需说明合理性", "固定年限要求可能限制竞争，建议改为具有类似项目经验并明确证明材料。", "供应商资格"));
  }

  if (content.includes("单方解释权") || content.includes("无限责任") || content.includes("不退还任何费用")) {
    risks.push(createRisk("UNFAIR_CLAUSE", "HIGH", "存在疑似霸王条款", "建议删除单方解释、无限责任或明显失衡的责任条款。", "合同条款"));
  }

  if (risks.length === 0) {
    risks.push(createRisk("LOW_RISK_NOTICE", "LOW", "未发现明显高风险项", "仍建议由采购、法务和业务负责人进行人工复核。", "整体文件"));
  }

  return risks;
}

function createRisk(type, level, title, description, section) {
  return {
    type,
    level,
    title,
    description,
    suggestion: description,
    section
  };
}

function createRecord(requirement, parameters, templates, document, risks) {
  return {
    id: Date.now(),
    generationNo: `PG${formatDateNo()}${String(state.records.length + 1).padStart(3, "0")}`,
    requirement,
    parameters,
    templates,
    document,
    risks,
    status: "SUCCESS",
    createdAt: new Date().toLocaleString("zh-CN")
  };
}

async function runStep(step, delay) {
  markStep(step, "active");
  await wait(delay);
  markStep(step, "done");
}

function markStep(step, status) {
  const item = document.querySelector(`[data-step="${step}"]`);
  if (!item) {
    return;
  }

  item.classList.remove("active", "done");
  item.classList.add(status);
}

function resetFlow() {
  elements.flowItems.forEach((item) => item.classList.remove("active", "done"));
  elements.structuredOutput.textContent = "等待语义解析结果...";
}

function setRunState(text, type) {
  elements.runState.textContent = text;
  elements.runState.className = `run-state ${type || ""}`.trim();
}

function setControlsDisabled(disabled) {
  elements.form.querySelectorAll("button, input, textarea").forEach((item) => {
    item.disabled = disabled;
  });
}

function setOutputActions(enabled) {
  elements.regenerateBtn.disabled = !enabled;
  elements.adjustBtn.disabled = !enabled;
  elements.exportBtn.disabled = !enabled;
}

function renderDocumentPreview() {
  if (!state.currentRecord) {
    elements.documentPreview.innerHTML = '<p class="empty-text">完成生成后，将在这里展示采购文件内容。</p>';
    return;
  }

  elements.documentPreview.innerHTML = state.currentRecord.document[state.currentSection];
}

function renderRiskReview() {
  const risks = state.currentRecord?.risks || [];
  const summary = {
    HIGH: risks.filter((risk) => risk.level === "HIGH").length,
    MEDIUM: risks.filter((risk) => risk.level === "MEDIUM").length,
    LOW: risks.filter((risk) => risk.level === "LOW").length
  };

  elements.riskCount.textContent = `${risks.length} 项`;
  elements.highRisk.textContent = summary.HIGH;
  elements.mediumRisk.textContent = summary.MEDIUM;
  elements.lowRisk.textContent = summary.LOW;

  if (!risks.length) {
    elements.riskList.innerHTML = '<p class="empty-text">暂无风险审查结果。</p>';
    return;
  }

  elements.riskList.innerHTML = risks
    .map(
      (risk) => `
        <div class="risk-item ${risk.level.toLowerCase()}">
          <strong>${risk.title}</strong>
          <p>${risk.description}</p>
          <span>${risk.level} · ${risk.section}</span>
        </div>
      `
    )
    .join("");
}

function renderRecords() {
  if (!state.records.length) {
    elements.recordTableBody.innerHTML = '<tr><td colspan="6" class="empty-cell">暂无生成记录</td></tr>';
    return;
  }

  elements.recordTableBody.innerHTML = state.records
    .map(
      (record) => `
        <tr>
          <td>${record.generationNo}</td>
          <td>${record.requirement.title}</td>
          <td>${record.status}</td>
          <td>${record.risks.length}</td>
          <td>${record.createdAt}</td>
          <td><button class="record-action" data-record-id="${record.id}">查看</button></td>
        </tr>
      `
    )
    .join("");

  elements.recordTableBody.querySelectorAll(".record-action").forEach((button) => {
    button.addEventListener("click", () => openRecord(Number(button.dataset.recordId)));
  });
}

function openRecord(recordId) {
  const record = state.records.find((item) => item.id === recordId);
  if (!record) {
    showToast("未找到生成记录");
    return;
  }

  state.currentRecord = record;
  state.currentSection = "announcement";
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.section === "announcement");
  });
  elements.structuredOutput.textContent = JSON.stringify(record.parameters, null, 2);
  setRunState("已加载记录", "success");
  renderDocumentPreview();
  renderRiskReview();
  setOutputActions(true);
  switchView("workspace");
}

function regenerateDocument() {
  if (!state.currentRecord) {
    return;
  }

  const source = state.currentRecord;
  const document = generateDocument(source.requirement, source.parameters, source.templates);
  document.contract = document.contract.replace("付款应以验收合格、发票合规和资料齐备为前提", "付款应以验收合格、发票合规、资料齐备和内部审批通过为前提");

  const risks = reviewRisks(source.requirement, source.parameters, document);
  const record = {
    ...createRecord(source.requirement, source.parameters, source.templates, document, risks),
    parentGenerationId: source.id
  };

  state.currentRecord = record;
  state.records.unshift(record);
  saveRecords();
  renderDocumentPreview();
  renderRiskReview();
  renderRecords();
  showToast("已基于当前记录重新生成一个新版本");
}

function adjustDocument() {
  if (!state.currentRecord) {
    return;
  }

  const sectionName = getSectionName(state.currentSection);
  const instruction = window.prompt(`请输入对“${sectionName}”的调整要求`, "补充公平、合理、可执行的合规表述。");
  if (!instruction) {
    return;
  }

  const source = state.currentRecord;
  const document = { ...source.document };
  document[state.currentSection] += `
    <h5>调整说明</h5>
    <p>${escapeHtml(instruction)}</p>
  `;

  const risks = reviewRisks(source.requirement, source.parameters, document);
  const record = {
    ...createRecord(source.requirement, source.parameters, source.templates, document, risks),
    parentGenerationId: source.id
  };

  state.currentRecord = record;
  state.records.unshift(record);
  saveRecords();
  renderDocumentPreview();
  renderRiskReview();
  renderRecords();
  showToast("已完成局部内容调整并重新审查风险");
}

function exportWord() {
  if (!state.currentRecord) {
    return;
  }

  const record = state.currentRecord;
  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(record.requirement.title)}</title>
        <style>
          body { font-family: "Microsoft YaHei", Arial, sans-serif; line-height: 1.75; color: #1f2926; }
          h1 { text-align: center; }
          h2 { border-bottom: 1px solid #d9e2dd; padding-bottom: 8px; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(record.requirement.title)}采购文件</h1>
        <p>生成编号：${record.generationNo}</p>
        <h2>一、招标公告</h2>${record.document.announcement}
        <h2>二、招标文件主体</h2>${record.document.bid}
        <h2>三、合同条款</h2>${record.document.contract}
        <h2>四、评审标准</h2>${record.document.evaluation}
      </body>
    </html>
  `;

  const blob = new Blob(["\ufeff", html], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${record.requirement.title}_${record.generationNo}.doc`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
  showToast("已导出 Word 文件");
}

function loadDemo() {
  elements.title.value = demoRequirement.title;
  elements.content.value = demoRequirement.content;
  elements.budget.value = demoRequirement.budget;
  elements.delivery.value = demoRequirement.delivery;
  elements.supplier.value = demoRequirement.supplier;
  showToast("已填入示例采购需求");
}

function resetWorkspace() {
  elements.form.reset();
  state.currentRecord = null;
  resetFlow();
  setRunState("等待输入");
  setOutputActions(false);
  renderDocumentPreview();
  elements.riskCount.textContent = "0 项";
  elements.highRisk.textContent = "0";
  elements.mediumRisk.textContent = "0";
  elements.lowRisk.textContent = "0";
  elements.riskList.innerHTML = '<p class="empty-text">暂无风险审查结果。</p>';
}

async function copyStructuredParams() {
  const text = elements.structuredOutput.textContent;
  if (!text || text.includes("等待")) {
    showToast("暂无可复制的结构化参数");
    return;
  }

  await navigator.clipboard.writeText(text);
  showToast("结构化参数 JSON 已复制");
}

function clearRecords() {
  state.records = [];
  state.currentRecord = null;
  saveRecords();
  renderRecords();
  resetWorkspace();
  showToast("生成记录已清空");
}

function switchView(viewName) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.toggle("active", item.dataset.view === viewName);
  });

  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  document.querySelector(`#${viewName}-view`).classList.add("active");
}

function inferBackground(content) {
  const firstSentence = content.split(/[。！？]/).find(Boolean);
  return firstSentence || "根据业务发展和日常运营需要，采购人拟开展本次采购项目。";
}

function inferCategory(content, title) {
  const source = `${title}${content}`;
  if (source.includes("电脑") || source.includes("办公设备")) return "办公设备";
  if (source.includes("软件") || source.includes("系统")) return "信息化软件服务";
  if (source.includes("服务器") || source.includes("网络")) return "信息化硬件设备";
  if (source.includes("装修") || source.includes("施工")) return "工程施工";
  if (source.includes("咨询") || source.includes("运维")) return "专业服务";
  return "通用采购";
}

function findBudget(content) {
  const match = content.match(/预算(?:金额)?[^\d]*(\d+(?:\.\d+)?)(万)?/);
  if (!match) return 0;
  const amount = Number(match[1]);
  return match[2] ? amount * 10000 : amount;
}

function findQuantity(content) {
  const match = content.match(/(\d+)\s*(台|套|批|项|个|件)/);
  return match ? `${match[1]}${match[2]}` : "";
}

function findDelivery(content) {
  const match = content.match(/(\d+\s*(天|日|个月|月|周))内?/);
  return match ? match[1] : "";
}

function inferSupplier(content) {
  const sentences = content.split(/[。！？]/).filter((sentence) => /供应商|资质|经验|营业执照/.test(sentence));
  return sentences.join("，");
}

function splitRequirements(text) {
  return text
    .split(/[，,；;]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function inferTechnicalRequirements(content, category) {
  const requirements = [];
  if (category.includes("办公设备")) {
    requirements.push("设备应满足日常办公、财务系统和协同办公场景使用要求");
    requirements.push("应支持批量部署、统一配置和主流办公软件运行");
  }

  if (content.includes("国产")) {
    requirements.push("应满足国产主流操作系统兼容要求");
  }

  if (!requirements.length) {
    requirements.push("应满足采购人提出的功能、性能、安全和稳定性要求");
  }

  return requirements;
}

function inferServiceRequirements(content) {
  const requirements = ["供应商应提供交付计划、安装调试、验收配合和售后响应服务"];
  if (content.includes("质保")) {
    requirements.push("供应商应按照承诺提供质保服务，并明确响应时限");
  }
  if (content.includes("上门")) {
    requirements.push("供应商应具备上门服务能力");
  }
  return requirements;
}

function formatMoney(amount) {
  return Number(amount || 0).toLocaleString("zh-CN");
}

function formatDateNo() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function getSectionName(section) {
  return {
    announcement: "招标公告",
    bid: "招标文件主体",
    contract: "合同条款",
    evaluation: "评审标准"
  }[section];
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    elements.toast.classList.remove("show");
  }, 2200);
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem("procurementGenerationRecords") || "[]");
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem("procurementGenerationRecords", JSON.stringify(state.records.slice(0, 20)));
}
