
function hhmmssmsToMs(hhmmssms) {
  const str = String(hhmmssms).padStart(9, '0'); // 항상 9자리 확보
  const hours = parseInt(str.slice(0, 2), 10);
  const minutes = parseInt(str.slice(2, 4), 10);
  const seconds = parseInt(str.slice(4, 6), 10);
  const ms = parseInt(str.slice(6, 9), 10);
  return (hours * 3600 + minutes * 60 + seconds) * 1000 + ms;
}

function msToHHmmss(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours + ":" + minutes + ":" + seconds;
}

function msToHHmmssms(ms) {
  const totalSeconds = Math.floor(ms / 1000);
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  const millis = String(ms % 1000).padStart(3, '0');;
  return hours + ":" + minutes + ":" + seconds + "." + millis;
}