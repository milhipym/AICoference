function openErrorPopup() {
    if (mainModel.logfile == null) {
        alert("파일을 선택해주세요.");
        return;
    }

    // mainModel은 이 파일 외부에 선언된 전역 객체로 가정합니다.
    errorAnalyzeView.setData(mainModel.searchObj, mainModel.logfile);

    var searchWords = ["Exception", "exception"];
    
    // startByFile 함수 역시 외부에 선언된 함수로 가정합니다.
    // (시그니처가 변경되었을 수 있으니 확인: "analyze", "showErrorAnalyze" 인자)
    startByFile(mainModel.logfile, searchWords, 0, 0, "analyze", "showErrorAnalyze");
    
    // searchWordEl은 main.js의 전역 변수로 가정합니다.
    searchWordEl.value = ""; 
}

function showErrorAnalyze() {
    // mainModel은 이 파일 외부에 선언된 전역 객체로 가정합니다.
    var length = mainModel.searchObj.searchTypeSize;
    var searchTypeSortedArray = new Array(length);

    for (var i = 0; i < length; i++) {
        searchTypeSortedArray[i] =
            mainModel.searchObj.searchTypeCountArray[i].toString().padStart(10, 0)
            + ":" + i.toString().padStart(10, 0) + ":" + mainModel.searchObj.searchTypeArray[i];
    }
    searchTypeSortedArray.sort().reverse();
    console.log("searchTypeSortedArray = ", searchTypeSortedArray);

    errorAnalyzeView.showErrorAnalyzeModal(searchTypeSortedArray);
}
//==========================================================
// 범용 AI 호출 헬퍼 함수
//==========================================================
async function aiCall(api_url, api_body, success_callback, error_callback) {
    try {
        const res = await fetch(api_url, {
            method: "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(api_body)
        });
        if (!res.ok) throw new Error("서버 응답 오류");
        const data = await res.json();
        success_callback(data);
    } catch (err) {
        error_callback(err);
    }
}

// ==========================================================
// 2. ErrorAnalyzeView 클래스
// ==========================================================

class ErrorAnalyzeView {

    constructor() {
        // errorAnalyzeViewModel이 정의되어 있다고 가정합니다.
        // (제공된 코드에는 없지만, 생성자에 존재함)
        this.errorAnalyzeModel = new errorAnalyzeViewModel(); 
    }

    setData(searchObj, logfile) {
        this.errorAnalyzeModel.searchObj = searchObj;
        this.errorAnalyzeModel.logfile = logfile;
    }

    showErrorAnalyzeModal(searchTypeSortedArray) {

        const modal = new Modal({
            size: 'lg'
        });

        var title = "Exception";

        // 컨테이너 생성
        const container = document.createElement('div');
        container.className = 'erroranalyze-mm-container';
        container.innerHTML = `
		<header style="display:flex; flex-wrap:wrap; gap:12px; align-items:center; justify-content:space-between; margin-bottom:12px;">
		  <div class="erroranalyze-title"><span class="erroranalyze-dot"></span>${title}</div>
		  <div class="erroranalyze-summary">
			<span id="erroranalyze-total">총 0 건</span>
			<span>•</span>
			<span id="erroranalyze-files">-</span>
		  </div>
		</header>

		<div class="erroranalyze-split">
		  <section class="erroranalyze-pane erroranalyze-pane-list" aria-label="타입별 건수">
			<div class="erroranalyze-pane-header">타입별 건수</div>
			<div class="erroranalyze-pane-content">
			  <div class="erroranalyze-wrap" id="erroranalyze-list"></div>
			</div>
		  </section>

		  <section class="erroranalyze-pane erroranalyze-pane-detail" aria-label="AI 분석">
			<div class="erroranalyze-pane-header erroranalyze-spinnerfield" id="erroranalyze-spinnerfield">
				<span>AI 분석</span>
				<div class="erroranalyze-spinner" aria-hidden="true"></div>
				<div id="erroranalyze-modelselect" class="erroranalyze-modelselect" role="tablist" aria-label="모델 선택" data-index="1" tabindex="0" title="클릭하면 모델이 선택됩니다">
				  <div class="erroranalyze-thumb" aria-hidden="true"></div>
				  <button role="tab" data-index="0" data-value="8b" aria-selected="false">8b</button>
				  <button role="tab" data-index="1" data-value="70b" aria-selected="true">70b</button>
				  <button role="tab" data-index="2" data-value="qwen" aria-selected="false">qwen</button>
				</div>
			</div>
			<div class="erroranalyze-pane-content" id="erroranalyze-detail">
			  </div>
		  </section>
		</div>
		`;
        modal.setContent(container);

        // 스크롤 모드 적용 (Modal 라이브러리 커스텀으로 보임)
        modal.body.classList.remove('mm-body');
        modal.body.classList.add('erroranalyze-mm-body');
        modal.body.classList.add('erroranalyze-scroll-split');
        modal.body.classList.add('ufomode');

        modal.removeHeader();

        // 푸터
        modal.setFooterButton([
            {
                label: '닫기', variant: 'primary', onClick: m => {
                    m.close();
                }
            }
        ]);
        modal.open();

        this.renderErrorAnalyze(container, searchTypeSortedArray);
    }

    renderErrorAnalyze(container, searchTypeSortedArray) {

        const total = this.errorAnalyzeModel.searchObj.searchTypeCountArray.reduce((s, i) => s + i, 0);
        container.querySelector('#erroranalyze-total').textContent = `총 ${total.toLocaleString()} 건`;
        container.querySelector('#erroranalyze-files').textContent = this.errorAnalyzeModel.logfile.name;

        const list = container.querySelector('#erroranalyze-list');
        const detail = container.querySelector('#erroranalyze-detail');

        var errorList = new Array();

        searchTypeSortedArray.forEach((it, idx) => {
            var count = parseInt(it.slice(0, 10));
            var index = parseInt(it.slice(11, 21));
            var text = it.slice(22, it.length);
            var pct = Math.round((count / total) * 100);
            pct = pct == 0 ? 1 : pct;
            const card = document.createElement('div');
            card.className = 'searchlist-card';
            
            // 'showSearchTypeList' 함수는 전역에 선언되어 있어야 합니다. (코드 미포함)
            card.innerHTML = `
			<div class="searchlist-cardinfo">
			  <div class="searchlist-row1">
				<div class="searchlist-actions">
				  <button type="button" class="erroranalyze-timelabel" onclick="showSearchTypeList(${index});">상세보기</button>      
				</div>
				<div class="searchlist-rangecount">
				  <span>${count.toLocaleString()} 건</span>
				  <span class="searchlist-muted"></span>
				</div>
			  </div>
			  <div class="searchlist-range searchlist-wordwrap">${text}</div>
			</div>
			</div>
				<div class="searchlist-barwrap" aria-label="비율 막대">
				  <div class="searchlist-rangebar" style="width:${pct}%"></div>
				</div>
			  </div>
		  `;
            list.appendChild(card);

            errorList.push(text + " >> " + count + "건");
        });

        // ai 모델 선택 설정
        const modelselect = container.querySelector('#erroranalyze-modelselect');
        modelselect.addEventListener('click', (e) => {

            const btn = e.target.closest('button');
            if (btn) {
                if (this.errorAnalyzeModel.isAiCall_ErrorAnalyze)
                    return;
                const idx = btn.dataset.index;
                modelselect.dataset.index = idx;
                console.log("idx = ", idx);
                modelselect.querySelectorAll('button').forEach(b => {
                    b.setAttribute('aria-selected', String(b.dataset.index === idx));
                });

                this.aiCall_ErrorAnalyze(detail, modelselect, errorList);
            }
        });

        // 모달 최초 로드 시 AI 분석 실행
        this.aiCall_ErrorAnalyze(detail, modelselect, errorList);
    }

    /**
     * AI 분석 호출 (오류 분석용)
     */
    aiCall_ErrorAnalyze(detail, modelselect, errorList) {

        var model = "";
        modelselect.querySelectorAll('button').forEach(b => {
            if (modelselect.dataset.index == b.dataset.index)
                model = b.dataset.value;
        });
        console.log("model = ", model);

        var api_url = "http://10.10.22.81:8080/vllm_chat";
        var api_body = {};
        api_body.model = model; // "8b", "70b", "qwen"
        api_body.limit = 20000;
        api_body.text = ""; // 텍스트 초기화

        // 상위 8개 (또는 그 이하)의 오류 목록을 텍스트로 만듦
        for (var n = 0; n < errorList.length; n++) {
            if (n != 0)
                api_body.text += "\n";
            api_body.text += errorList[n];

            if (n > 7) // 상위 8개까지만
                break;
        }

        // ======================================================
        // ★★★ 핵심 변경점: AI 프롬프트 (Markdown 형식 요청) ★★★
        // ======================================================
        api_body.text += "\n\n<< 위 에러 목록을 분석하여 처리 우선순위를 정해주세요.";
        api_body.text += "\n각 우선순위별로 발생 상황, 대응 방법, 추천 사항, 발생 샘플 코드를 순서대로 상세히 설명해주세요.";
        api_body.text += "\n\n===== 응답 형식 (Markdown) =====\n";
        api_body.text += "**🚨 가장 긴급한 문제**\n- (분석 내용...)\n\n";
        api_body.text += "**⚠️ 중요한 문제**\n- (분석 내용...)\n\n";
        api_body.text += "**ℹ️ 일반적인 문제**\n- (분석 내용...)\n\n";
        api_body.text += "모든 답변은 한글로 작성하고, 요청한 마크다운 형식을 반드시 지켜주세요.";
        // ======================================================

        this.setErrorAnalyzeSpinnerLoading(true);
        this.errorAnalyzeModel.isAiCall_ErrorAnalyze = true;

        aiCall(api_url,
            api_body,
            (data) => {
                // ======================================================
                // ★★★ 핵심 변경점: AI 응답 (DOM 박스 재조립) ★★★
                // ======================================================
                this.setErrorAnalyzeSpinnerLoading(false);
                this.errorAnalyzeModel.isAiCall_ErrorAnalyze = false;

                var content = data.content || "AI 분석 결과가 없습니다.";
                
                // 1. 'detail' 영역(우측 패널)을 비웁니다.
                detail.innerHTML = ''; 

                // 2. AI 박스를 담을 부모 컨테이너를 생성합니다.
                const aiBoxesContainer = document.createElement('div');
                aiBoxesContainer.className = 'ai-analysis-container';
                detail.appendChild(aiBoxesContainer);

                // 3. marked.js를 사용하여 Markdown을 HTML로 변환합니다.
                const tempDiv = document.createElement('div');
                if (typeof marked === 'undefined') {
                    console.error("marked.js 라이	브러리가 로드되지 않았습니다!");
                    aiBoxesContainer.innerText = "오류: marked.js 라이브러리가 필요합니다.";
                    return;
                }
                tempDiv.innerHTML = marked.parse(content);

                // 4. DOM 재조립을 위한 변수 설정 (프롬프트와 일치해야 함)
                let currentBox = null;
                const headings = ["🚨 가장 긴급한 문제", "⚠️ 중요한 문제", "ℹ️ 일반적인 문제"];

                // 5. 변환된 HTML 노드를 순회하며 박스(box) DOM 재조립
                Array.from(tempDiv.childNodes).forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
                        return; // 빈 텍스트 노드 건너뛰기
                    }

                    const nodeText = node.textContent.trim();
                    const isHeading = headings.some(h => nodeText.startsWith(h));
                    
                    // 마크다운 헤더 태그 확인 (p>strong, h2, h3 등)
                    const isHeadingTag = (node.tagName === 'P' || node.tagName === 'H2' || node.tagName === 'H3');

                    if (isHeading && isHeadingTag) {
                        // === 새 박스 생성 ===
                        currentBox = document.createElement('div');
                        currentBox.className = 'ai-result-box'; // 재사용 CSS
                        
                        const header = document.createElement('div');
                        header.className = 'ai-result-header'; // 재사용 CSS
                        header.innerHTML = node.innerHTML;
                        
                        const contentDiv = document.createElement('div');
                        contentDiv.className = 'ai-result-content'; // 재사용 CSS
                        
                        currentBox.appendChild(header);
                        currentBox.appendChild(contentDiv);
                        
                        aiBoxesContainer.appendChild(currentBox);
                    
                    } else if (currentBox) {
                        // 현재 열린 박스의 컨텐츠 영역에 노드 추가
                        const contentDiv = currentBox.querySelector('.ai-result-content');
                        if (contentDiv) {
                            contentDiv.appendChild(node.cloneNode(true));
                        }
                    } else {
                        // (첫 번째 섹션 제목 전의 컨텐츠가 있다면 여기에 추가)
                        aiBoxesContainer.appendChild(node.cloneNode(true));
                    }
                });
                // ======================================================

            },
            (error) => {
                this.setErrorAnalyzeSpinnerLoading(false);
                this.errorAnalyzeModel.isAiCall_ErrorAnalyze = false;
                detail.innerHTML = `<div style="color: #ff6b6b; padding: 20px;">AI 분석 실패: ${error.message}</div>`;
                // alert(`API 호출 실패: ${error.message}`); // 모달 내에 표시하는 것으로 대체
            }
        );
    }

    setErrorAnalyzeSpinnerLoading(on) {
        const field = document.getElementById('erroranalyze-spinnerfield');
        if (field) { // field가 null이 아닐 때만 실행
            field.classList.toggle('loading', on);
        } else {
            console.warn("#erroranalyze-spinnerfield 요소를 찾을 수 없습니다.");
        }
    }
}

// ==========================================================
// 3. 뷰 인스턴스 생성
// ==========================================================
var errorAnalyzeView = new ErrorAnalyzeView();

// (참고) errorAnalyzeViewModel 클래스 정의가 필요합니다.
// (생성자에서 new errorAnalyzeViewModel()을 사용하고 있습니다.)
// 예시:
if (typeof errorAnalyzeViewModel === 'undefined') {
    class errorAnalyzeViewModel {
        constructor() {
            this.searchObj = null;
            this.logfile = null;
            this.isAiCall_ErrorAnalyze = false;
        }
    }
}