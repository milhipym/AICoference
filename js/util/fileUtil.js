async function getText(file,startByte, endByte) {

  const reader = file.slice(startByte, endByte).stream().getReader();
  const decoder = new TextDecoder("utf-8");
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  text += decoder.decode(); // flush
  return text;
}