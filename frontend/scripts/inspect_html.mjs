import http from "http";

http.get("http://127.0.0.1:3000", (res) => {
  let html = "";
  res.on("data", (c) => (html += c));
  res.on("end", () => {
    console.log("HTML length:", html.length);
    console.log("Has #team:", html.includes('id="team"'));
    console.log("Has #treatments:", html.includes('id="treatments"'));
    console.log("Has #why-us:", html.includes('id="why-us"'));
    console.log("Has #faq:", html.includes('id="faq"'));
    const matches = html.match(/id="[^"]+"/g);
    console.log("All IDs:", matches);
  });
});

