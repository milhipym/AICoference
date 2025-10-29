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
  
  // 경고 및 권장사항
  const warnings = [];
  const recommendations = [];
  
  if (parseFloat(errorRate) > 1.0) {
    warnings.push(`에러율이 ${errorRate}%로 높습니다 - 즉시 점검 필요`);
  }
  if (avgErrors > 100) {
    warnings.push(`일평균 에러 ${avgErrors}건 - 안정성 개선 필요`);
  }
  
  recommendations.push(`피크 시간대(${peakHours[0]}) 이전 시스템 리소스 확인`);
  recommendations.push('주요 에러 패턴 분석 및 로그 필터링 강화');
  
  // HTML 생성
  const jarvisHTML = `
    <h4>📊 전체 개요</h4>
    <ul>
      <li>분석 기간: <span class="highlight">${documents.length}일</span></li>
      <li>총 요청 수: <span class="highlight">${totalRequests.toLocaleString()}건</span></li>
      <li>총 에러 수: <span class="${totalErrors > 1000 ? 'critical' : 'warning'}">${totalErrors.toLocaleString()}건</span></li>
      <li>에러율: <span class="${parseFloat(errorRate) > 1 ? 'critical' : 'highlight'}">${errorRate}%</span></li>
      <li>일평균 요청: <span class="highlight">${avgRequests.toLocaleString()}건</span></li>
      <li>일평균 에러: <span class="highlight">${avgErrors.toLocaleString()}건</span></li>
    </ul>
    
    <h4>🔍 패턴 분석</h4>
    <ul>
      <li>피크 시간대: <span class="highlight">${peakHours.join(', ')}</span></li>
      <li>최고 사용일: <span class="highlight">${maxRequestDay.dateFormatted}</span> (${maxRequestDay.requests.toLocaleString()}건)</li>
      <li>최다 에러일: <span class="highlight">${maxErrorDay.dateFormatted}</span> (${maxErrorDay.errors.toLocaleString()}건)</li>
      <li>주요 기기: <span class="highlight">${topDevice ? topDevice[0] : '데이터 없음'}</span></li>
    </ul>
    
    ${warnings.length > 0 ? `
    <h4>⚠️ 주의사항</h4>
    <ul>
      ${warnings.map(w => `<li class="warning">${w}</li>`).join('')}
    </ul>
    ` : ''}
    
    <h4>💡 권장사항</h4>
    <ul>
      ${recommendations.map(r => `<li>${r}</li>`).join('')}
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
