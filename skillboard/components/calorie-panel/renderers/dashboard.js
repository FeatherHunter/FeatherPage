import { config } from '../config.js';
/**
 * 渲染卡路里仪表盘视图
 * 显示：今日摄入/目标、营养素占比、体重趋势、运动消耗
 */
export async function renderDashboardView(panel, db) {
    const shadow = panel.getShadow();
    const content = shadow.getElementById('view-content');
    const today = new Date().toISOString().split('T')[0];
    // 并行查询：每日摘要 + 体重历史 + 运动汇总
    const [summaryResult, weightResult, exerciseResult] = await Promise.all([
        db.exec(config.queries.find(q => q.id === 'daily-summary').sql, { date: today }),
        db.exec(`SELECT date, time, weight_kg, bmi, note FROM weight_log
       ORDER BY date DESC LIMIT 10`, {}),
        db.exec(`SELECT
         COALESCE(SUM(calories_burned), 0) AS total_cal,
         COALESCE(SUM(duration_minutes), 0) AS total_dur,
         COUNT(*) AS ex_count
       FROM exercise_log WHERE date = '${today}'`, {}),
    ]);
    const summary = (summaryResult.rows || [])[0] || {};
    const weightRow = (weightResult.rows || [])[0];
    const exerciseRow = (exerciseResult.rows || [])[0] || {};
    const calorieGoal = Number(summary['calorie_goal'] ?? 1800);
    const totalCal = Number(summary['total_cal'] ?? 0);
    const totalProtein = Number(summary['total_protein'] ?? 0);
    const totalCarbs = Number(summary['total_carbs'] ?? 0);
    const totalFat = Number(summary['total_fat'] ?? 0);
    const calPct = calorieGoal > 0 ? Math.min((totalCal / calorieGoal) * 100, 100) : 0;
    const remaining = calorieGoal - totalCal;
    const entryCount = Number(summary['entry_count'] ?? 0);
    const weightVal = weightRow ? Number(weightRow['weight_kg']) : null;
    const weightGoal = Number(summary['weight_goal'] ?? 0) || null;
    const weightGap = weightVal && weightGoal ? (weightVal - weightGoal).toFixed(1) : null;
    const burnedCal = Number(exerciseRow['total_cal'] ?? 0);
    const burnedDur = Number(exerciseRow['total_dur'] ?? 0);
    // 计算宏占比
    const calFromProtein = totalProtein * 4;
    const calFromCarbs = totalCarbs * 4;
    const calFromFat = totalFat * 9;
    const totalMacroCal = calFromProtein + calFromCarbs + calFromFat || 1;
    const proteinPct = (calFromProtein / totalMacroCal * 100).toFixed(0);
    const carbsPct = (calFromCarbs / totalMacroCal * 100).toFixed(0);
    const fatPct = (calFromFat / totalMacroCal * 100).toFixed(0);
    const MACRO_COLORS = ['#51cf66', '#ffd43b', '#ff922b'];
    content.innerHTML = `
    <div class="dashboard">
      <div class="dashboard-header">
        <span>今日概览</span>
        <span class="dashboard-date">${today}</span>
      </div>

      <div class="dash-cards">

        <div class="dash-card">
          <div class="dash-card-label">今日摄入</div>
          <div class="dash-card-value ${totalCal > calorieGoal ? 'over' : ''}">${totalCal.toFixed(0)}</div>
          <div class="dash-card-unit">千卡</div>
          <div class="dash-card-sub">目标 ${calorieGoal}</div>
        </div>

        <div class="dash-card">
          <div class="dash-card-label">剩余可吃</div>
          <div class="dash-card-value ${remaining < 0 ? 'over' : ''}">${Math.max(0, remaining).toFixed(0)}</div>
          <div class="dash-card-unit">千卡</div>
          <div class="dash-card-sub">今日已吃 ${totalCal.toFixed(0)}</div>
        </div>

        <div class="dash-card">
          <div class="dash-card-label">今日记录</div>
          <div class="dash-card-value neutral">${entryCount}</div>
          <div class="dash-card-unit">笔</div>
        </div>

        ${weightVal !== null ? `
        <div class="dash-card">
          <div class="dash-card-label">当前体重</div>
          <div class="dash-card-value neutral">${weightVal.toFixed(1)}</div>
          <div class="dash-card-unit">公斤</div>
          ${weightGap !== null ? `<div class="dash-card-sub">距目标 ${weightGap} kg</div>` : ''}
        </div>
        ` : ''}

        <div class="dash-card">
          <div class="dash-card-label">运动消耗</div>
          <div class="dash-card-value expense">${burnedCal > 0 ? '-' + burnedCal.toFixed(0) : '0'}</div>
          <div class="dash-card-unit">千卡</div>
          ${burnedDur > 0 ? `<div class="dash-card-sub">${burnedDur} 分钟</div>` : ''}
        </div>

      </div>

      <!-- 热量进度条 -->
      <div class="calorie-progress-section">
        <div class="calorie-progress-header">
          <span>热量进度</span>
          <span>${totalCal.toFixed(0)} / ${calorieGoal} 千卡</span>
        </div>
        <div class="calorie-bar-track">
          <div class="calorie-bar-fill ${totalCal > calorieGoal ? 'over' : ''}" style="width:${calPct}%"></div>
        </div>
        <div class="calorie-bar-labels">
          <span>${Math.round(calPct)}%</span>
          <span>${remaining >= 0 ? '剩余 ' + remaining.toFixed(0) + ' 千卡' : '超出 ' + Math.abs(remaining).toFixed(0) + ' 千卡'}</span>
        </div>
      </div>

      <!-- 营养素占比 -->
      ${(totalProtein + totalCarbs + totalFat) > 0 ? `
      <div class="macro-section">
        <div class="macro-section-header">营养素摄入（克）</div>
        <div class="macro-cards">
          <div class="macro-card" style="border-left: 3px solid ${MACRO_COLORS[0]}">
            <div class="macro-card-label">蛋白质</div>
            <div class="macro-card-value">${totalProtein.toFixed(1)}</div>
            <div class="macro-card-unit">g</div>
            <div class="macro-bar-track">
              <div class="macro-bar-fill" style="width:${proteinPct}%;background:${MACRO_COLORS[0]}"></div>
            </div>
            <div class="macro-pct">${proteinPct}%</div>
          </div>
          <div class="macro-card" style="border-left: 3px solid ${MACRO_COLORS[1]}">
            <div class="macro-card-label">碳水</div>
            <div class="macro-card-value">${totalCarbs.toFixed(1)}</div>
            <div class="macro-card-unit">g</div>
            <div class="macro-bar-track">
              <div class="macro-bar-fill" style="width:${carbsPct}%;background:${MACRO_COLORS[1]}"></div>
            </div>
            <div class="macro-pct">${carbsPct}%</div>
          </div>
          <div class="macro-card" style="border-left: 3px solid ${MACRO_COLORS[2]}">
            <div class="macro-card-label">脂肪</div>
            <div class="macro-card-value">${totalFat.toFixed(1)}</div>
            <div class="macro-card-unit">g</div>
            <div class="macro-bar-track">
              <div class="macro-bar-fill" style="width:${fatPct}%;background:${MACRO_COLORS[2]}"></div>
            </div>
            <div class="macro-pct">${fatPct}%</div>
          </div>
        </div>
      </div>
      ` : ''}

    </div>
  `;
}
