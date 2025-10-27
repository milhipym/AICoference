// searchList.js

var searchListModel = new searchListViewModel();

function showSearchWordList() {

  searchListModel.isLineInfoPlusYn = false;

  var _selectTimeRangeStartIndex = -1;
  var _selectTimeRangeEndIndex = -1;
  
  var _start = "";
  var _end = "";
  var _totalsize = 0;
  
  console.log("mainModel.timeRangeObj.timeRangeCountArray = ", mainModel.timeRangeObj.timeRangeCountArray);

    mainModel.selectEv.points.forEach(pt => {

      console.log("pt = ", pt);
      const size = mainModel.timeRangeObj.xRangeSizeArray[pt.pointIndex];
      if (size > 0) {
    
      _totalsize+= 	mainModel.timeRangeObj.timeRangeCountArray[parseInt(pt.pointIndex/2)];

        if (_selectTimeRangeStartIndex == -1) {
          _selectTimeRangeStartIndex = pt.pointIndex;
        }
        _selectTimeRangeEndIndex = pt.pointIndex;

        const start = mainModel.timeRangeObj.xRangeArray[pt.pointIndex - 1];
        const end = mainModel.timeRangeObj.xRangeArray[pt.pointIndex + 1];
        console.log("start = ", start);
        console.log("end = ", end);
      
      if(_start == "") 
        _start = start;
      _end = end;

        // 1,3,5  >>>  0,1,2
        searchListModel.selectTimeRangeStartIndex = parseInt(_selectTimeRangeStartIndex / 2);
        searchListModel.selectTimeRangeEndIndex = parseInt(_selectTimeRangeEndIndex / 2);
      }
    });
    console.log("start = ",mainModel.timeRangeObj.xRangeArray[_selectTimeRangeStartIndex]);
    console.log("end = ",mainModel.timeRangeObj.xRangeArray[_selectTimeRangeEndIndex]);

  if(_totalsize > 0)  
    showSearchListModal(_start,_end,_totalsize,-1);
}

function showSearchTypeList(searchTypeIndex) {

  searchListModel.isLineInfoPlusYn = false;

  var _start = "";
  var _end = "";
  var _totalsize = 0;

  searchListModel.selectTimeRangeStartIndex = 0;

  var length = mainModel.timeRangeObj.timeRangeEndByteArray.length;
  for(var n=length-1;n>=0;n--){
    if (mainModel.timeRangeObj.timeRangeEndByteArray[n] != 0){
      searchListModel.selectTimeRangeEndIndex  = n;
      break;
    }
  }
  _start = mainModel.timeRangeObj.xRangeArray[0];
  _end = mainModel.timeRangeObj.xRangeArray[mainModel.timeRangeSize * 2];
  _totalsize = mainModel.searchObj.searchTypeCountArray[searchTypeIndex];

  console.log("_start = ",_start);
  console.log("_end = ",_end);
  console.log("_totalsize = ",_totalsize);

  if(_totalsize > 0)  
    showSearchListModal(_start,_end,_totalsize,searchTypeIndex);
}

function showSearchListModal(_start,_end,_totalsize,searchTypeIndex){
  var content = `<div class="searchlist-wrap" id="list"></div>`;
  const modal = new Modal({
    size: 'lg'
  });

  const container = document.createElement('div');
  container.innerHTML = content;
  modal.setContent(container);
  
  modal.body.classList.add('ufomode');

  var rangeAnalyzeBtn_display = searchTypeIndex == -1 ? "block" : "none";

  var header = `<div class="searchlist-bar">
					<!-- 왼쪽 -->
					<div class="searchlist-left">
					  <span class="searchlist-icon"></span>검색 &gt; <span class="searchlist-info-badge">${mainModel.getSearchWordTitle()}</span>
            </div>
					<!-- 가운데 -->
					<div class="searchlist-center">
					  <span class="searchlist-time">${_start} ~ ${_end}</span>
					  <button class="searchlist-btn" style="display:${rangeAnalyzeBtn_display}" onclick="btnClickRangeAnalyze();">구간건수</button>
					</div>
					<!-- 오른쪽 -->
					<div class="searchlist-right">
            <span>라인 정보+</span>
            <input type="checkbox" id="cbLineInfoPlus" onclick="cbClickLineInfoPlus(this,${searchTypeIndex});" style="margin-right:30px;">
            <span class="searchlist-count">총 ${_totalsize.toLocaleString()}건</span></div>
				  </div>
				`;
  
  const bar = document.createElement("div");
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

  getLineList(container,searchTypeIndex);
}

function getLineList(container,searchTypeIndex) {

  const list = container.querySelector('#list');
  list.replaceChildren();

  // 구간별로~ 가져와보자.
  console.log("searchListModel.searchObj.searchLineStartByteArray.length = ", mainModel.searchObj.searchLineStartByteArray.length);

  console.log("searchListModel.selectTimeRangeStartIndex = ", searchListModel.selectTimeRangeStartIndex);
  console.log("searchListModel.selectTimeRangeEndIndex = ", searchListModel.selectTimeRangeEndIndex);

  var startTimeRangeStartByte = 
        searchListModel.selectTimeRangeStartIndex == 0 ? 0 
        : mainModel.timeRangeObj.timeRangeEndByteArray[searchListModel.selectTimeRangeStartIndex - 1] + 1;
  var endTimeRangeEndByte = mainModel.timeRangeObj.timeRangeEndByteArray[searchListModel.selectTimeRangeEndIndex];

  console.log("startTimeRangeStartByte = ", startTimeRangeStartByte);
  console.log("endTimeRangeEndByte = ", endTimeRangeEndByte);

  var count = 0;
  for (var i = 0; i < mainModel.searchObj.searchLineStartByteArray.length; i++) {
    var startByte = mainModel.searchObj.searchLineStartByteArray[i];
    var endByte = mainModel.searchObj.searchLineEndByteArray[i];
    if (endByte == 0) {
      break;
    }

    // 천라인까지만
    if (count > 1000)
      break;

    if (startByte >= startTimeRangeStartByte && startByte <= endTimeRangeEndByte) {
      if(searchTypeIndex != -1
         && searchTypeIndex != mainModel.searchObj.searchLineTypeIndexArray[i])
         continue;
      getLine(container, startByte, endByte, i,searchTypeIndex);
      count++;
    }
  }
}

function showRangeAnalyze() {

  var items = new Array();
  var content = "";

  var _selectTimeRangeStartIndex = -1;
  var _selectTimeRangeEndIndex = -1;

  mainModel.selectEv.points.forEach(pt => {

    console.log("pt = ", pt);
    const size = mainModel.timeRangeObj.xRangeSizeArray[pt.pointIndex];
    if (size > 0) {

      if (_selectTimeRangeStartIndex == -1) {
        _selectTimeRangeStartIndex = pt.pointIndex;
      }
      _selectTimeRangeEndIndex = pt.pointIndex;

      const start = mainModel.timeRangeObj.xRangeArray[pt.pointIndex - 1];
      const end = mainModel.timeRangeObj.xRangeArray[pt.pointIndex + 1];
      console.log("start = ", start);
      console.log("end = ", end);

      var item = {
        range: start + " - " + end
        , file: "file" + pt.y
        , count: mainModel.timeRangeObj.timeRangeCountArray[parseInt(pt.pointIndex / 2)]
      };

      items.push(item);

      // 1,3,5  >>>  0,1,2
      mainModel.selectTimeRangeStartIndex = parseInt(_selectTimeRangeStartIndex / 2);
      mainModel.selectTimeRangeEndIndex = parseInt(_selectTimeRangeEndIndex / 2);
    }
  });

  console.log("items = ", items);
  if (items.length > 0) {
    content = `<div class="searchlist-wrap" id="list"></div>`;

    const modal = new Modal({
      size: 'md'
    });

    const container = document.createElement('div');
    container.innerHTML = content;
    modal.setContent(container);

    // 데이터 렌더
    const total = items.reduce((s, i) => s + i.count, 0);
    const max = Math.max(...items.map(i => i.count)) || 1;

    const list = container.querySelector('#list');
    items.forEach((it, idx) => {
      const pct = Math.round((it.count / total) * 100);
      const card = document.createElement('div');
      card.className = 'searchlist-card';
      card.innerHTML = `
        <div class="searchlist-cardinfo">
          <div class="searchlist-row1">
            <div class="searchlist-range">${it.range}</div>
            <div class="searchlist-filetag">${it.file}</div>
            <div class="searchlist-rangecount">
              <span>${it.count.toLocaleString()} 건</span>
              <span class="searchlist-muted"></span>
            </div>
          </div>
          
          <div class="searchlist-barwrap" aria-label="비율 막대">
            <div class="searchlist-rangebar" style="width:${pct}%"></div>
          </div>
          
        </div>
      `;
      list.appendChild(card);
    });

    // 상단 버튼
    modal.setHeaderButton([
      {
        label: '건수', variant: 'ghost', onClick: m => {

        }
      }
    ]);
    modal.setFooterButton([
      {
        label: '닫기', variant: 'primary', onClick: m => {
          m.close();

        }
      }
    ]);
    modal.open();
  }
}

function cbClickLineInfoPlus(cb,searchTypeIndex) {
	//alert(cb.checked);

  console.log("searchTypeIndex",searchTypeIndex);

  var container = cb.closest(".mm-panel").querySelector(".mm-body");

  searchListModel.isLineInfoPlusYn = cb.checked;

  const list = container.querySelector('#list');
  list.replaceChildren();

  if(searchTypeIndex != -1) {
    searchListModel.selectTimeRangeStartIndex = 0;

    var length = mainModel.timeRangeObj.timeRangeEndByteArray.length;
    for(var n=length-1;n>=0;n--){
      if (mainModel.timeRangeObj.timeRangeEndByteArray[n] != 0){
        searchListModel.selectTimeRangeEndIndex  = n;
        break;
      }
    }
  }

  getLineList(container,searchTypeIndex);
}

function btnClickRangeAnalyze() {
	showRangeAnalyze();
}

function btnClickLineAIAnalyze() {
	alert("AIAnalyze");
}

async function getLine(container, startByte, endByte, searchObjIndex,searchTypeIndex) {
	
  //console.log("mainModel.searchObj.searchLineArray = ",mainModel.searchObj.searchLineArray);	

  var time = mainModel.searchObj.searchLineArray[searchObjIndex];
  time = hhmmssmsToMs(time);
  time = msToHHmmssms(time);
  time = `⏰ ${time}`;

  var range = searchListModel.isLineInfoPlusYn ? searchListModel.lineInfoPlusRange : 0;

  var fronttext = "";

  if(range > 0) {
    var frontStartByte = startByte > range ? startByte - range : 0;
    var frontEndByte = startByte > 1 ? startByte - 1 : 0;
    if (frontEndByte > 0)
      fronttext = await getText(mainModel.logfile,frontStartByte, frontEndByte);
  }

  var targettext = await getText(mainModel.logfile,startByte, endByte);

  if(targettext.startsWith("\n")){
    targettext = targettext.substring(1);
  }

  for(var n=0;n<mainModel.searchObj.searchWords.length;n++){
    var replaceSearch = '<span class="searchlist-textred">' + mainModel.searchObj.searchWords[n] + '</span>';
    targettext = targettext.replaceAll(mainModel.searchObj.searchWords[n], replaceSearch);
  }  

  if(range > 0) {
    targettext = '<span style="background:rgba(121, 192, 255, 0.1);color:#79c0ff;">' + targettext + '</span>';
  }

  var bottomtext = "";
  if(range > 0) {
    var bottomStartByte = endByte + 1 > mainModel.totalByte ? mainModel.totalByte : endByte + 1;
    var bottomEndByte = endByte + range > mainModel.totalByte ? mainModel.totalByte : endByte + range;
    if (bottomEndByte < mainModel.totalByte)
      bottomtext = await getText(mainModel.logfile,bottomStartByte, bottomEndByte);
  }
  //var linediv = range > 0 ? 
  //  '<div style="border-top: 1px solid #fff;"></div>' : "";
	
  if(bottomtext.startsWith("\n")){
	  bottomtext = bottomtext.substring(1);
  }
  var text = "";
  if(range > 0) 
    text = fronttext + "\n" + targettext+ "\n" + bottomtext;
  else
    text = targettext; 

  const list = container.querySelector('#list');
  const card = document.createElement('div');
  card.className = 'searchlist-card';
  card.innerHTML = `
	<div class="searchlist-actions">
		<span class="searchlist-timelabel">${time}</span>
		<button type="button" class="searchlist-btn" style="margin-left:auto;" id="btnArroundLog" onclick="showDetailInfoS(${searchObjIndex},${searchTypeIndex})">상세보기</button>
	</div>
	<div class="searchlist-cardinfo">
		<div class="searchlist-row1">
			<div class="searchlist-range searchlist-wordwrap">${text}</div>
		</div>
	</div>
	`;
  list.appendChild(card);
}



