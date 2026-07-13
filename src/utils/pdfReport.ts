import { nextTick } from 'vue'
import { FACTOR_NORMS, OVERALL_NORMS, SEVERITY_TEXT } from '@/data/norms'
import type { Scl90Result } from '@/utils/score'
import { buildLineChartSvg } from '@/utils/charts'
import {
  displayScore,
  escapeHtml,
  factorReportName,
  formatDate,
  formatDisplayDate
} from '@/utils/report'

/** 导出临床结果单 PDF */
export async function exportClinicalPdf(result: Scl90Result, conclusion: string): Promise<void> {
  const reportEl = buildClinicalReportElement(result, conclusion)
  document.body.appendChild(reportEl)

  try {
    await nextTick()
    const [{ default: html2canvas }, jsPdfModule] = await Promise.all([
      import('html2canvas'),
      import('jspdf')
    ])
    const JsPDF = jsPdfModule.default || jsPdfModule.jsPDF

    const canvas = await html2canvas(reportEl, {
      scale: 1.25,
      useCORS: true,
      backgroundColor: '#ffffff',
      windowWidth: reportEl.scrollWidth,
      windowHeight: reportEl.scrollHeight
    })
    const imageData = canvas.toDataURL('image/jpeg', 0.76)
    const pdf = new JsPDF('p', 'mm', 'a4')
    const pageWidth = pdf.internal.pageSize.getWidth()
    const pageHeight = pdf.internal.pageSize.getHeight()
    const imageHeight = (canvas.height * pageWidth) / canvas.width

    let position = 0
    let remainingHeight = imageHeight

    pdf.addImage(imageData, 'JPEG', 0, position, pageWidth, imageHeight, undefined, 'FAST')
    remainingHeight -= pageHeight

    while (remainingHeight > 0) {
      position -= pageHeight
      pdf.addPage()
      pdf.addImage(imageData, 'JPEG', 0, position, pageWidth, imageHeight, undefined, 'FAST')
      remainingHeight -= pageHeight
    }

    pdf.save(`SCL-90医院式结果单-${formatDate(new Date())}.pdf`)
  } finally {
    reportEl.remove()
  }
}

function buildClinicalReportElement(report: Scl90Result, reportConclusion: string): HTMLDivElement {
  const el = document.createElement('div')
  el.className = 'clinical-pdf-host'
  el.style.position = 'fixed'
  el.style.left = '-10000px'
  el.style.top = '0'
  el.style.width = '794px'
  el.style.background = '#fff'
  el.style.zIndex = '-1'
  el.innerHTML = buildClinicalReportHtml(report, reportConclusion)
  return el
}

function buildClinicalReportHtml(report: Scl90Result, reportConclusion: string): string {
  const now = new Date()
  const factorRows = report.factors
    .map(
      (f) => `
        <tr>
          <td>${escapeHtml(factorReportName(f))}</td>
          <td>${f.total}</td>
          <td>${displayScore(f.average)}</td>
          <td>${escapeHtml(SEVERITY_TEXT[f.level])}</td>
          <td>${escapeHtml(FACTOR_NORMS[f.key] || '-')}</td>
        </tr>
      `
    )
    .join('')

  return `
    <style>
      .clinical-sheet {
        width: 794px;
        padding: 28px 44px 24px;
        background: #fff;
        color: #222;
        font-family: "SimSun", "Songti SC", "Microsoft YaHei", Arial, sans-serif;
        box-sizing: border-box;
      }

      .clinical-title {
        text-align: center;
        font-size: 24px;
        font-weight: 700;
        letter-spacing: 2px;
        margin: 0 0 12px;
      }

      .clinical-subtitle {
        text-align: center;
        font-size: 12px;
        color: #555;
        margin-bottom: 12px;
      }

      .clinical-info {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 5px 22px;
        font-size: 12px;
        line-height: 1.45;
        padding: 0 4px 10px;
        border-bottom: 2px solid #333;
      }

      .clinical-table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 10px;
        font-size: 12px;
        line-height: 1.28;
      }

      .clinical-table th {
        font-weight: 700;
        text-align: center;
        border-bottom: 1.5px solid #333;
        padding: 4px 6px;
      }

      .clinical-table td {
        text-align: center;
        border-bottom: 1px solid #d7d7d7;
        padding: 3px 6px;
      }

      .clinical-table th:first-child,
      .clinical-table td:first-child {
        text-align: left;
      }

      .clinical-section-title {
        text-align: center;
        font-size: 16px;
        font-weight: 700;
        margin: 14px 0 6px;
      }

      .clinical-chart {
        margin-top: 4px;
        border-top: 1.5px solid #333;
        border-bottom: 1.5px solid #333;
        padding: 6px 0 2px;
      }

      .clinical-result {
        margin-top: 12px;
        border-top: 2px solid #333;
        padding-top: 9px;
        font-size: 12px;
        line-height: 1.55;
      }

      .clinical-result strong {
        display: block;
        font-size: 14px;
        margin-bottom: 4px;
      }

      .clinical-note {
        margin-top: 5px;
        color: #666;
        font-size: 11px;
      }
    </style>
    <div class="clinical-sheet">
      <h1 class="clinical-title">SCL-90症状自评量表结果单</h1>
      <div class="clinical-subtitle">测试结果仅供参考，不作诊断使用</div>

      <div class="clinical-info">
        <div>量表名称：SCL-90 症状自评量表</div>
        <div>题目数：90</div>
        <div>报告类型：自评筛查</div>
        <div>计分方式：1-5 五级计分</div>
        <div>参考常模：中国常模(1986,n=1388)</div>
        <div>测试日期：${formatDisplayDate(now)}</div>
      </div>

      <table class="clinical-table">
        <thead>
          <tr>
            <th>项目</th>
            <th>原始分</th>
            <th>平均分</th>
            <th>参考</th>
            <th>均分±标准差</th>
          </tr>
        </thead>
        <tbody>
          <tr><td>总分</td><td>${report.totalScore}</td><td></td><td></td><td>${OVERALL_NORMS.totalScore}</td></tr>
          <tr><td>总均分</td><td></td><td>${displayScore(report.gsi)}</td><td></td><td>${OVERALL_NORMS.gsi}</td></tr>
          <tr><td>阴性项目数</td><td>${report.negativeCount}</td><td></td><td></td><td>${OVERALL_NORMS.negativeCount}</td></tr>
          <tr><td>阳性项目数</td><td>${report.positiveCount}</td><td></td><td></td><td>${OVERALL_NORMS.positiveCount}</td></tr>
          <tr><td>阳性项目平均分</td><td></td><td>${displayScore(report.psdi)}</td><td></td><td></td></tr>
          ${factorRows}
        </tbody>
      </table>

      <div class="clinical-section-title">90项症状清单</div>
      <div class="clinical-chart">${buildLineChartSvg(report.factors)}</div>

      <div class="clinical-result">
        <strong>测评结果</strong>
        ${escapeHtml(reportConclusion)}
        <div class="clinical-note">说明：SCL-90 为症状自评筛查工具，分数越高提示对应维度主观困扰越明显；如结果提示异常或困扰持续，请咨询专业心理或精神科医生。</div>
      </div>
    </div>
  `
}
