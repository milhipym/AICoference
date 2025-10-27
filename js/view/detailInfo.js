// detailInfo.js

var detailInfoModel = new detailInfoViewModel();

function showDetailInfoS(searchObjIndex,searchTypeIndex) {
	
  detailInfoModel.arroundSearchObjIndex = searchObjIndex;	

  var content = `<div class="searchlist-wrap" id="list"></div>`;
  const modal = new Modal({
    size: 'lg'
  });

  const container = document.createElement('div');
  container.innerHTML = content;
  modal.setContent(container);
  
  modal.body.classList.add('ufomode');

  const bar = document.createElement("div");
  
  var header = `<div class="searchlist-bar">
					<!-- 왼쪽 -->
					<div class="searchlist-left">
					  <span class="searchlist-icon"></span>검색 &gt; <span class="searchlist-info-badge">${mainModel.getSearchWordTitle()}</span>
					</div>
					<!-- 가운데 -->
					<div class="searchlist-center">
					  <button class="detailinfo-AI-btn" onclick="doDetailAIAnalyze(detailInfoModel.contentText, 'qwen', 4096);">AI분석</button>
					</div>
					<!-- 오른쪽 -->
					<div class="searchlist-right">
						<button class="detailinfo-prev-next-btn" onclick="btnClickPrevLine(this,${searchTypeIndex});">&lt;</button>
						<button class="detailinfo-prev-next-btn" style ="margin-left:15px;" onclick="btnClickNextLine(this,${searchTypeIndex});">&gt;</button>
					</div>
				  </div>
				`;
				
  bar.innerHTML = header;
  
  modal.setHeaderElement(bar);
  
  modal.header.classList.add('ufomode');

  modal.setFooterButton([
    {
      label: '닫기', variant: 'primary', onClick: m => {
        m.close();
      }
    }
  ]);
  modal.open();

  getLineArround(container, searchObjIndex);
}

function btnClickLineAIAnalyze() {
	alert(detailInfoModel.arroundSearchObjIndex);
}

function btnClickPrevLine(btn,searchTypeIndex) {
	console.log("btn = ",btn);
	var list = btn.closest(".mm-panel").querySelector(".mm-body");
	console.log("list = ",list);

	if(detailInfoModel.arroundSearchObjIndex > 0) {
		detailInfoModel.arroundSearchObjIndex--;
    if(searchTypeIndex!= -1 && 
      searchTypeIndex != mainModel.searchObj.searchLineTypeIndexArray[detailInfoModel.arroundSearchObjIndex])
      btnClickPrevLine(btn,searchTypeIndex);
    else 
		  getLineArround(list, detailInfoModel.arroundSearchObjIndex);
	}
}

function btnClickNextLine(btn,searchTypeIndex) {
	console.log("btn = ",btn);
	var list = btn.closest(".mm-panel").querySelector(".mm-body");;
	
	console.log("detailInfoModel.arroundSearchObjIndex = ",detailInfoModel.arroundSearchObjIndex);
	
	var endTimeRangeEndByte = mainModel.timeRangeObj.timeRangeEndByteArray[mainModel.timeRangeSize-1];
	
	var startByte = mainModel.searchObj.searchLineStartByteArray[detailInfoModel.arroundSearchObjIndex+1];
	
	if(startByte == 0)
		return;
	
	console.log("endTimeRangeEndByte = ",endTimeRangeEndByte);
	console.log("startByte = ",startByte);
	
	if (startByte <= endTimeRangeEndByte) {
		detailInfoModel.arroundSearchObjIndex++;

    if(searchTypeIndex!= -1 && 
        searchTypeIndex != mainModel.searchObj.searchLineTypeIndexArray[detailInfoModel.arroundSearchObjIndex])
      btnClickNextLine(btn,searchTypeIndex);
    else 
		  getLineArround(list, detailInfoModel.arroundSearchObjIndex);
	}
}

async function getLineArround(container, searchObjIndex) {

  var startByte = mainModel.searchObj.searchLineStartByteArray[searchObjIndex];
  var endByte = mainModel.searchObj.searchLineEndByteArray[searchObjIndex];

  console.log("searchObjIndex = ", searchObjIndex);
  console.log("startByte = ", startByte);
  console.log("endByte = ", endByte);

  var time = mainModel.searchObj.searchLineArray[searchObjIndex];
  time = hhmmssmsToMs(time);
  time = msToHHmmssms(time);

  var text = "";

  var range = detailInfoModel.arrondPlusByte;

  var frontStartByte = startByte > range ? startByte - range : 0;
  var frontEndByte = startByte > 1 ? startByte - 1 : 0;

  var fronttext = "";
  if (frontEndByte > 0)
    fronttext = await getText(mainModel.logfile,frontStartByte, frontEndByte);

  console.log("fronttext = ", fronttext);

  var targettext = await getText(mainModel.logfile,startByte, endByte);

  console.log("targettext = ", targettext);
  targettext = targettext.replaceAll("\n","");;

  var bottomStartByte = endByte + 1 > mainModel.totalByte ? mainModel.totalByte : endByte + 1;
  var bottomEndByte = endByte + range > mainModel.totalByte ? mainModel.totalByte : endByte + range;

  var bottomtext = "";
  if (bottomEndByte < mainModel.totalByte)
    bottomtext = await getText(mainModel.logfile,bottomStartByte, bottomEndByte);

  console.log("bottomtext = ", bottomtext);

  detailInfoModel.contentText = fronttext + "\n" + targettext + "\n"+ bottomtext;

  const formattedLogText = formatLogContentWithHighlight(detailInfoModel.contentText, targettext, targettext);

  const list = container.querySelector('#list');
  const card = document.createElement('div');
  card.className = 'searchlist-card';
  card.innerHTML = `
	<div class="searchlist-cardinfo">
		<div class="searchlist-row1">
			<div class="searchlist-range searchlist-wordwrap" id="detailinfo-content">${formattedLogText.content}</div>
		</div>
	</div>
	`;
  list.replaceChildren();	
  list.appendChild(card);

  //console.log("formattedLogText = ", formattedLogText);

  /*
  document.getElementById("cardDetailRoundSearch").scrollIntoView({
    behavior: "auto",  // 애니메이션 없이
    block: "center"       // 화면의 중앙에 맞춤 ("start","center","end" 가능)
  });*/

  // 4. DOM 업데이트가 완료된 후 스크롤 이동
  if (formattedLogText.highlightId) {
    requestAnimationFrame(() => {
      const highlightedEl = document.getElementById(formattedLogText.highlightId);
      if (highlightedEl) {
        highlightedEl.scrollIntoView({
          behavior: 'instant',
          block: 'center'
        });
      }
    });
  }

}

function showDetailAiAnalyze() {
	doDetailAIAnalyze(detailInfoModel.contentText, 'qwen', 4096);
}




