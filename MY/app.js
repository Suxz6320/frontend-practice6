const state = {
  rawData: null
};
let barChartIns = null;
let lineChartIns = null;
let pieChartIns = null;

const loadData = async () => {
  $('#status').text('加载中…').show();
  try {
    const resp = await fetch('data/borrow.json');
    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}`);
    }

    const data = await resp.json();
    if (!data.series || data.series.length === 0) {
      $('#status').text('暂无数据').show();
      return;
    }

    state.rawData = data;
    $('#source-info').text(`${data.title}｜统计周期：${data.period}｜${data.source}`);
    $('#status').hide();

    renderStatCards(data);
    renderSummary(data);
    renderBarEcharts(data);
    renderLineChartJS(data);
    renderCategoryRatio(data);
  } catch (err) {
    $('#status').text('加载失败：' + err.message).show();
  }
};

function renderStatCards(data) {
  $('#card-wrap').empty();

  data.series.forEach(item => {
    const total = item.counts.reduce((sum, val) => sum + val, 0);
    $('#card-wrap').append(`
      <div class="col-md-4">
        <div class="card card-item">
          <div class="card-body">
            <h3 class="card-title h6">${item.category}</h3>
            <p class="card-text fs-4">${total}</p>
            <p class="card-text small text-muted">12个月累计借阅（册）</p>
          </div>
        </div>
      </div>
    `);
  });

  $('#card-wrap').off('click', '.card-item').on('click', '.card-item', function () {
    $(this).toggleClass('border-primary shadow');
  });
}

function renderSummary(data) {
  const monthTotals = data.months.map((month, index) => {
    const total = data.series.reduce((sum, item) => sum + item.counts[index], 0);
    return { month, total };
  });

  const categoryTotals = data.series.map(item => ({
    category: item.category,
    total: item.counts.reduce((sum, val) => sum + val, 0)
  }));

  const totalBorrow = categoryTotals.reduce((sum, item) => sum + item.total, 0);
  const topCategory = categoryTotals.reduce((max, item) => item.total > max.total ? item : max, categoryTotals[0]);
  const peakMonth = monthTotals.reduce((max, item) => item.total > max.total ? item : max, monthTotals[0]);
  const avgMonthly = Math.round(totalBorrow / data.months.length);

  $('#summary-wrap').html(`
    <div class="col-md-4">
      <div class="card stat-card border-0 shadow-sm h-100">
        <div class="card-body">
          <div class="text-muted small">总借阅量</div>
          <div class="fs-3 fw-bold">${totalBorrow}</div>
          <div class="small text-muted">累计 12 个月总数（册）</div>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card stat-card border-0 shadow-sm h-100">
        <div class="card-body">
          <div class="text-muted small">最高借阅类别</div>
          <div class="fs-4 fw-bold">${topCategory.category}</div>
          <div class="small text-muted">${topCategory.total} 册</div>
        </div>
      </div>
    </div>
    <div class="col-md-4">
      <div class="card stat-card border-0 shadow-sm h-100">
        <div class="card-body">
          <div class="text-muted small">峰值月份</div>
          <div class="fs-4 fw-bold">${peakMonth.month}</div>
          <div class="small text-muted">${peakMonth.total} 册 / 月</div>
        </div>
      </div>
    </div>
    <div class="col-md-12">
      <div class="card border-0 shadow-sm">
        <div class="card-body">
          <span class="badge bg-primary-subtle text-primary">研究结论</span>
          <div class="mt-2 text-muted">
            平均每月借阅量约 <strong>${avgMonthly}</strong> 册，${topCategory.category} 作为主力类目在全年中贡献了最多借阅量，说明读者对该类图书的需求最稳定。<br>
            结合趋势图可见，月度波动与学期节奏有关，整体呈现“高峰-回落-稳定”的变化特征。
          </div>
        </div>
      </div>
    </div>
  `);
}

function renderBarEcharts(data) {
  if (!barChartIns) {
    barChartIns = echarts.init(document.querySelector('#bar-chart'));
  }

  const seriesOpt = data.series.map(s => ({
    name: s.category,
    type: 'bar',
    data: s.counts
  }));

  barChartIns.setOption({
    title: { text: '各图书分类每月借阅量', left: 'center' },
    tooltip: { trigger: 'axis' },
    legend: { bottom: 0 },
    xAxis: { data: data.months },
    yAxis: { name: '借阅册数' },
    series: seriesOpt
  });
}

function renderLineChartJS(data) {
  if (lineChartIns !== null) {
    lineChartIns.destroy();
  }

  const ctxDom = document.querySelector('#line-chart');
  const datasetsArr = data.series.map(s => ({
    label: s.category,
    data: s.counts,
    borderWidth: 1
  }));

  lineChartIns = new Chart(ctxDom, {
    type: 'line',
    data: {
      labels: data.months,
      datasets: datasetsArr
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        title: { display: true, text: '各类图书12个月借阅趋势' }
      },
      scales: {
        y: { beginAtZero: true }
      }
    }
  });
}

function renderCategoryRatio(data) {
  if (!pieChartIns) {
    pieChartIns = echarts.init(document.querySelector('#ratio-chart'));
  }

  const categoryTotals = data.series.map(item => ({
    name: item.category,
    value: item.counts.reduce((sum, val) => sum + val, 0)
  }));

  pieChartIns.setOption({
    title: { text: '各分类借阅占比', left: 'center' },
    tooltip: { trigger: 'item', formatter: '{b}: {c} 册 ({d}%)' },
    legend: { bottom: 0 },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      center: ['50%', '45%'],
      data: categoryTotals,
      label: {
        formatter: '{b}\n{d}%'
      }
    }]
  });
}

window.addEventListener('resize', () => {
  if (barChartIns) {
    barChartIns.resize();
  }
  if (pieChartIns) {
    pieChartIns.resize();
  }
});

$(function () {
  loadData();
});