// ==================== 대시보드 통합 기능 ====================

// 파일명을 타이틀에 표시하는 함수
function updateTitlesWithFileName() {
  const file = mainModel.logfile;
  if (!file) {
    console.warn('[updateTitlesWithFileName] 파일이 없습니다');
    return;
  }
  
  const fileName = file.name;
  console.log('[updateTitlesWithFileName] 파일명:', fileName);
  
  // Overall Statistics 타이틀 업데이트
  const overallStatsTitle = document.getElementById('overallStatsTitle');
  if (overallStatsTitle) {
    overallStatsTitle.textContent = `${fileName} - Overall Statistics`;
    console.log('[updateTitlesWithFileName] Overall Stats 타이틀 업데이트 완료');
  } else {
    console.error('[updateTitlesWithFileName] overallStatsTitle 엘리먼트를 찾을 수 없습니다');
  }
  
  // TOP 5 Requests 타이틀 업데이트
  const topRequestsTitle = document.getElementById('topRequestsTitle');
  if (topRequestsTitle) {
    topRequestsTitle.textContent = `${fileName} - TOP 5 UX_ Requests`;
    console.log('[updateTitlesWithFileName] TOP 5 Requests 타이틀 업데이트 완료');
  } else {
    console.error('[updateTitlesWithFileName] topRequestsTitle 엘리먼트를 찾을 수 없습니다');
  }
}

// 월간 대시보드 데이터 로드 및 차트 생성
let integratedCharts = {};

async function loadIntegratedDashboard() {
  const file = mainModel.logfile;
  if (!file) return;
  
  console.log('[Dashboard Integration] 월간 대시보드 데이터 로드 시작');
  
  try {
    // OpenSearch에서 데이터 가져오기
    const OPENSEARCH_API_BASE = "http://10.10.22.81:8080";
    const indexName = "contest_pm_task";
    
    // 날짜 추출 (파일명에서)
    const dateMatch = file.name.match(/(\d{8})/);
    let searchDate = null;
    if (dateMatch) {
      const dateStr = dateMatch[1];
      const year = dateStr.substring(0, 4);
      const month = dateStr.substring(4, 6);
      const day = dateStr.substring(6, 8);
      searchDate = `${year}-${month}-${day}`;
    }
    
    // OpenSearch 쿼리
    const searchQuery = {
      query: {
        bool: {
          must: searchDate ? [
            {
              match: {
                "local_statistics.logDate": searchDate
              }
            }
          ] : [{ match_all: {} }]
        }
      },
      size: 100
    };
    
    const response = await fetch(`${OPENSEARCH_API_BASE}/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        index: indexName,
        query: searchQuery
      })
    });
    
    if (!response.ok) {
      throw new Error('OpenSearch 데이터 로드 실패');
    }
    
    const result = await response.json();
    const documents = result.hits?.hits?.map(hit => hit._source) || [];
    
    console.log('[Dashboard Integration] 데이터 로드 완료:', documents.length, '개 문서');
    
    if (documents.length === 0) {
      console.warn('[Dashboard Integration] 데이터가 없습니다. 먼저 btn_learn_6으로 로그를 학습시켜주세요.');
      document.getElementById('jarvisAnalysisIntegrated').style.display = 'none';
      showDashboardError();
      return;
    }
    
    // 데이터 처리
    const dashboardData = processIntegratedDashboardData(documents);
    
    // JARVIS 분석 생성
    generateJarvisAnalysisIntegrated(dashboardData);
    
    // 차트 생성
    createIntegratedCharts(dashboardData);
    
  } catch (error) {
    console.error('[Dashboard Integration] 에러:', error);
    document.getElementById('jarvisAnalysisIntegrated').style.display = 'none';
    showDashboardError();
  }
}

// 차트 로드 실패 시 에러 메시지 표시
function showDashboardError() {
  // 통계 카드 초기화
  document.getElementById('totalDays').textContent = '-';
  document.getElementById('totalRequestsSummary').textContent = '-';
  document.getElementById('totalErrorsSummary').textContent = '-';
  document.getElementById('avgRequestsPerDay').textContent = '-';
  
  const errorMessage = `
    <div style="
      text-align: center;
      padding: 40px;
      color: #ff6b6b;
      font-size: 16px;
      background: rgba(255, 107, 107, 0.1);
      border: 2px solid rgba(255, 107, 107, 0.3);
      border-radius: 10px;
      margin: 20px 0;
    ">
      <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
      <div style="font-weight: bold; margin-bottom: 10px;">AI 통신 불가</div>
      <div style="font-size: 14px; color: #ffaa00;">
        OpenSearch 서버와 통신할 수 없거나 데이터가 없습니다.<br>
        먼저 btn_learn_6으로 로그를 학습시켜주세요.
      </div>
    </div>
  `;
  
  const chartIds = [
    'dailyRequestsChartIntegrated',
    'dailyErrorsChartIntegrated',
    'hourlyUsageChartIntegrated',
    'topDevicesChartIntegrated',
    'topUsersChartIntegrated',
    'topLocationsChartIntegrated'
  ];
  
  chartIds.forEach(id => {
    const canvas = document.getElementById(id);
    if (canvas) {
      const container = canvas.parentElement;
      container.innerHTML = `
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          height: 250px;
          color: #ff6b6b;
          font-size: 16px;
          font-weight: bold;
        ">
          ⚠️ AI 통신 불가
        </div>
      `;
    }
  });
}

function processIntegratedDashboardData(documents) {
  const dailyData = [];
  let totalRequests = 0;
  let totalErrors = 0;
  const hourlyUsage = {};
  const devices = {};
  const users = {};
  const locations = {};
  
  documents.forEach(doc => {
    const stats = doc.local_statistics || doc.ai_analysis || doc;
    const logDate = stats.logDate || doc.log_date || '날짜 미상';
    const logDateFormatted = stats.logDateFormatted || doc.log_date_formatted || logDate;
    
    const requests = parseInt(stats.totalRequests || 0);
    const errors = parseInt(stats.totalErrors || (stats.errorSamples || stats.errors || []).length);
    
    dailyData.push({
      date: logDate,
      dateFormatted: logDateFormatted,
      requests: requests,
      errors: errors
    });
    
    totalRequests += requests;
    totalErrors += errors;
    
    // 시간대별 사용량
    const hourly = stats.hourlyUsage || {};
    Object.entries(hourly).forEach(([hour, count]) => {
      hourlyUsage[hour] = (hourlyUsage[hour] || 0) + count;
    });
    
    // 기기
    const topDevices = stats.topDevices || {};
    Object.entries(topDevices).forEach(([device, count]) => {
      devices[device] = (devices[device] || 0) + count;
    });
    
    // 사용자
    const topUsers = stats.topUsers || {};
    Object.entries(topUsers).forEach(([user, count]) => {
      users[user] = (users[user] || 0) + count;
    });
    
    // 지역
    const topLocations = stats.topLocations || {};
    Object.entries(topLocations).forEach(([loc, count]) => {
      locations[loc] = (locations[loc] || 0) + count;
    });
  });
  
  return {
    dailyData,
    totalRequests,
    totalErrors,
    hourlyUsage,
    devices,
    users,
    locations,
    documents
  };
}

function generateJarvisAnalysisIntegrated(data) {
  const { dailyData, totalRequests, totalErrors, hourlyUsage, devices, users, documents } = data;
  
  // 통계 계산
  const avgRequests = Math.round(totalRequests / documents.length);
  const avgErrors = Math.round(totalErrors / documents.length);
  const errorRate = ((totalErrors / totalRequests) * 100).toFixed(3);
  
  // 통계 카드 업데이트
  document.getElementById('totalDays').textContent = `${documents.length}일`;
  document.getElementById('totalRequestsSummary').textContent = totalRequests.toLocaleString();
  document.getElementById('totalErrorsSummary').textContent = totalErrors.toLocaleString();
  document.getElementById('avgRequestsPerDay').textContent = avgRequests.toLocaleString();
  
  // 피크 시간대
  const peakHours = Object.entries(hourlyUsage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(h => `${h[0]}시`);
  
  // 주요 기기
  const topDevice = Object.entries(devices).sort((a, b) => b[1] - a[1])[0];
  
  // 최고 사용일
  const maxRequestDay = dailyData.reduce((max, day) => 
    day.requests > max.requests ? day : max, dailyData[0]);
  
  // 최다 에러일
  const maxErrorDay = dailyData.reduce((max, day) => 
    day.errors > max.errors ? day : max, dailyData[0]);
  
  // 시스템 상태 판단
  let systemStatus = '';
  let statusColor = '';
  
  if (parseFloat(errorRate) > 2.0 || avgErrors > 500) {
    systemStatus = '위험';
    statusColor = 'critical';
  } else if (parseFloat(errorRate) > 1.0 || avgErrors > 100) {
    systemStatus = '주의 필요';
    statusColor = 'warning';
  } else if (parseFloat(errorRate) > 0.5 || avgErrors > 50) {
    systemStatus = '양호';
    statusColor = 'good';
  } else {
    systemStatus = '매우 양호';
    statusColor = 'good';
  }
  
  // JARVIS 대화형 분석 생성
  const jarvisHTML = `
    <p class="jarvis-greeting">안녕하세요, 주인님. J.A.R.V.I.S입니다.</p>
    
    <div class="jarvis-section">
      <span class="jarvis-label">🎯 전반적인 상황</span>
      <p>
        지난 <span class="highlight">${documents.length}일</span> 동안의 시스템 로그를 분석한 결과, 
        총 <span class="highlight">${totalRequests.toLocaleString()}건</span>의 요청이 처리되었으며 
        <span class="${statusColor}">${totalErrors.toLocaleString()}건</span>의 에러가 발생했습니다. 
        현재 시스템 상태는 <span class="${statusColor}">"${systemStatus}"</span> 단계로 평가됩니다.
      </p>
      <p>
        에러율은 <span class="${parseFloat(errorRate) > 1 ? 'critical' : 'highlight'}">${errorRate}%</span>이며, 
        일평균 <span class="highlight">${avgRequests.toLocaleString()}건</span>의 요청과 
        <span class="${avgErrors > 100 ? 'warning' : 'highlight'}">${avgErrors.toLocaleString()}건</span>의 에러가 발생하고 있습니다.
      </p>
    </div>
    
    <div class="jarvis-section">
      <span class="jarvis-label">📊 패턴 분석</span>
      <p>
        시스템 사용 패턴을 분석한 결과, 가장 활발한 시간대는 
        <span class="highlight">${peakHours.join(', ')}</span>입니다. 
        특히 <span class="highlight">${maxRequestDay.dateFormatted}</span>에 
        최대 <span class="highlight">${maxRequestDay.requests.toLocaleString()}건</span>의 요청이 집중되었습니다.
      </p>
      <p>
        주요 접속 기기는 <span class="highlight">${topDevice ? topDevice[0] : '식별 불가'}</span>이며, 
        <span class="warning">${maxErrorDay.dateFormatted}</span>에 
        가장 많은 <span class="warning">${maxErrorDay.errors.toLocaleString()}건</span>의 에러가 기록되었습니다.
      </p>
    </div>
    
    ${parseFloat(errorRate) > 1.0 || avgErrors > 100 ? `
    <div class="jarvis-section">
      <span class="jarvis-label">⚠️ 주의사항</span>
      <p>
        ${parseFloat(errorRate) > 2.0 
          ? `주인님, <span class="critical">심각한 문제</span>가 감지되었습니다. 에러율 ${errorRate}%는 즉각적인 조치가 필요한 수준입니다.` 
          : parseFloat(errorRate) > 1.0 
            ? `에러율 ${errorRate}%는 정상 범위를 벗어났습니다. 가까운 시일 내에 점검이 필요합니다.`
            : ''}
        ${avgErrors > 500 
          ? ` 또한 일평균 <span class="critical">${avgErrors}건</span>의 에러는 시스템 안정성에 위협이 됩니다.`
          : avgErrors > 100
            ? ` 일평균 <span class="warning">${avgErrors}건</span>의 에러 발생은 개선이 필요한 수준입니다.`
            : ''}
      </p>
    </div>
    ` : ''}
    
    <div class="jarvis-section">
      <span class="jarvis-label">💡 권장사항</span>
      <p>
        ${parseFloat(errorRate) > 1.0 
          ? '우선적으로 에러 로그를 상세히 분석하여 반복되는 패턴을 찾아내시기 바랍니다. '
          : '현재 시스템은 안정적으로 운영되고 있으나, 지속적인 모니터링을 권장드립니다. '}
        피크 시간대인 <span class="highlight">${peakHours[0]}</span> 이전에 시스템 리소스를 미리 확인하시고, 
        필요시 스케일 아웃을 고려해주세요.
      </p>
      <p>
        ${avgErrors > 100 
          ? '에러 필터링 로직을 강화하고, 주요 에러 타입에 대한 예외 처리를 보완하시기 바랍니다. '
          : '로그 수집 및 알림 체계를 유지하시고, '}
        정기적인 성능 테스트를 통해 잠재적 병목 지점을 사전에 파악하시길 권장드립니다.
      </p>
    </div>
    
    <p style="margin-top: 20px; font-style: italic; color: #00d9ff;">
      언제든 필요하시면 말씀해주세요, 주인님. 제가 도와드리겠습니다.
    </p>
    </ul>
  `;
  
  document.getElementById('jarvisContentIntegrated').innerHTML = jarvisHTML;
  document.getElementById('jarvisAnalysisIntegrated').style.display = 'block';
}

function createIntegratedCharts(data) {
  const { dailyData, hourlyUsage, devices, users, locations } = data;
  
  // 기존 차트 삭제
  Object.values(integratedCharts).forEach(chart => {
    try {
      chart.destroy();
    } catch (e) {
      console.warn('차트 삭제 실패:', e);
    }
  });
  integratedCharts = {};
  
  // 차트 생성 헬퍼 함수
  function createChartSafely(canvasId, chartConfig, chartName) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.error(`Canvas ${canvasId} not found`);
        return null;
      }
      return new Chart(canvas, chartConfig);
    } catch (error) {
      console.error(`${chartName} 차트 생성 실패:`, error);
      const canvas = document.getElementById(canvasId);
      if (canvas) {
        const container = canvas.parentElement;
        container.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            height: 250px;
            color: #ff6b6b;
            font-size: 16px;
            font-weight: bold;
          ">
            ⚠️ AI 통신 불가
          </div>
        `;
      }
      return null;
    }
  }
  
  // 1. 일별 요청 수
  integratedCharts.dailyRequests = createChartSafely('dailyRequestsChartIntegrated', {
    type: 'line',
    data: {
      labels: dailyData.map(d => d.dateFormatted),
      datasets: [{
        label: '일별 요청 수',
        data: dailyData.map(d => d.requests),
        borderColor: '#00ffff',
        backgroundColor: 'rgba(0, 255, 255, 0.1)',
        borderWidth: 2,
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#00ffff' } }
      },
      scales: {
        y: { ticks: { color: '#00d9ff' }, grid: { color: 'rgba(0, 255, 255, 0.1)' } },
        x: { ticks: { color: '#00d9ff' }, grid: { color: 'rgba(0, 255, 255, 0.1)' } }
      }
    }
  }, '일별 요청 수');
  
  
  // 2. 일별 에러 수
  integratedCharts.dailyErrors = createChartSafely('dailyErrorsChartIntegrated', {
    type: 'bar',
    data: {
      labels: dailyData.map(d => d.dateFormatted),
      datasets: [{
        label: '일별 에러 수',
        data: dailyData.map(d => d.errors),
        backgroundColor: 'rgba(255, 99, 132, 0.7)',
        borderColor: '#ff6384',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#00ffff' } }
      },
      scales: {
        y: { ticks: { color: '#00d9ff' }, grid: { color: 'rgba(0, 255, 255, 0.1)' } },
        x: { ticks: { color: '#00d9ff' }, grid: { color: 'rgba(0, 255, 255, 0.1)' } }
      }
    }
  }, '일별 에러 수');
  
  // 3. 시간대별 사용량 (Radar)
  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
  const hourlyData = hours.map(h => hourlyUsage[h] || 0);
  
  integratedCharts.hourlyUsage = createChartSafely('hourlyUsageChartIntegrated', {
    type: 'radar',
    data: {
      labels: hours.map(h => `${h}시`),
      datasets: [{
        label: '시간대별 사용량',
        data: hourlyData,
        borderColor: '#00ffff',
        backgroundColor: 'rgba(0, 255, 255, 0.2)',
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#00ffff' } }
      },
      scales: {
        r: { 
          ticks: { color: '#00d9ff' }, 
          grid: { color: 'rgba(0, 255, 255, 0.1)' },
          pointLabels: { color: '#00d9ff' }
        }
      }
    }
  }, '시간대별 사용량');
  
  // 4. 주요 기기 (Doughnut)
  const topDevices = Object.entries(devices).sort((a, b) => b[1] - a[1]).slice(0, 5);
  integratedCharts.topDevices = createChartSafely('topDevicesChartIntegrated', {
    type: 'doughnut',
    data: {
      labels: topDevices.map(d => d[0]),
      datasets: [{
        data: topDevices.map(d => d[1]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#00ffff' } }
      }
    }
  }, '주요 기기');
  
  // 5. 주요 사용자 (Bar)
  const topUsers = Object.entries(users).sort((a, b) => b[1] - a[1]).slice(0, 10);
  integratedCharts.topUsers = createChartSafely('topUsersChartIntegrated', {
    type: 'bar',
    data: {
      labels: topUsers.map(u => u[0]),
      datasets: [{
        label: '사용 횟수',
        data: topUsers.map(u => u[1]),
        backgroundColor: 'rgba(75, 192, 192, 0.8)',
        borderColor: '#4bc0c0',
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      plugins: {
        legend: { labels: { color: '#00ffff' } }
      },
      scales: {
        y: { ticks: { color: '#00d9ff' }, grid: { color: 'rgba(0, 255, 255, 0.1)' } },
        x: { ticks: { color: '#00d9ff' }, grid: { color: 'rgba(0, 255, 255, 0.1)' } }
      }
    }
  }, '주요 사용자');
  
  // 6. 지역 분포 (Pie)
  const topLocations = Object.entries(locations).sort((a, b) => b[1] - a[1]).slice(0, 5);
  integratedCharts.topLocations = createChartSafely('topLocationsChartIntegrated', {
    type: 'pie',
    data: {
      labels: topLocations.map(l => l[0]),
      datasets: [{
        data: topLocations.map(l => l[1]),
        backgroundColor: [
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(153, 102, 255, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#00ffff' } }
      }
    }
  }, '지역 분포');
}
