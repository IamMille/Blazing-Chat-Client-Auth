class Search
{
  constructor() {
    dom = new SearchDom();
    this.currentPage = 0;
    this.pages = {
        0: "",
        1: "" //osv
    };
    $("input#maxResults").addEventListener("keyup", this.handleInput.bind(this));
    $("button#search").addEventListener("click", this.handleInput.bind(this));
    $("a#btnPrev").addEventListener("click", this.pageChange.bind(this));
    $("a#btnNext").addEventListener("click", this.pageChange.bind(this));
    this.getResults();
  }

  handleInput(event) {
    if (!event ||
       (event.type == "keyup" && event.key != "Enter") ||
       (event.type != "keyup" && event.type != "click")) return;

    this.currentPage = 0;
    this.page = {};
    this.getResults();
  }

  pageChange(event) {
    var el = event.target;
    var isDisabled = el.parentNode.classList.contains("disabled");
    if (isDisabled) return;

    var pageOffset = 0;
    pageOffset -= Number(el.id == 'btnPrev');
    pageOffset += Number(el.id == 'btnNext');
    this.currentPage += pageOffset;

    var startAt = this.pages[this.currentPage];
    this.getResults(startAt);
  }

  getResults(startAt='') {
    var numItems = Number($("#maxResults").value) || 5;

    $("#searchResults").innerHTML = ""; // clear previous searchResults
    var searchQuery = $("input#search").value;

    db.ref("msgs/")
      .orderByKey().startAt(startAt).limitToFirst(Number(numItems)+1) // orderBy() needed for equalTo()
      .once("value").then(snapshot =>
      {
        if (snapshot.numChildren() === 0)
          $("#searchInfo").innerHTML = `
            <div class="text">(No results for: <i>${searchQuery})</i></div>`;
        else
          $("#searchInfo").innerHTML = `
            <div class="text">Listing
            ${snapshot.numChildren()-1 != numItems ? snapshot.numChildren() : numItems }
            results:</div>`;

        var lastItem, i = 0;
        snapshot.forEach( snap => { // forEach INDEX can't be used
          if (numItems > i++) dom.insertChatMsg(snap);
          if (numItems < i) lastItem = snap.key; });

        $("#btnNext").parentNode.classList.add("disabled");
        $("#btnPrev").parentNode.classList.add("disabled");

        if (lastItem && lastItem != this.pages[this.currentPage]) {
          this.pages[this.currentPage+1] = lastItem;
          $("#btnNext").parentNode.classList.remove("disabled");
        }

        if (this.currentPage !== 0)
          $("#btnPrev").parentNode.classList.remove("disabled");

      }); // snapshort END

  }
}
class SearchDom
{
  insertChatMsg(snapshot)  // onChildAdded
  {
    var oMsg = snapshot.val();
        oMsg.id = snapshot.key;

    var keysRequired = ["chan", "event", "msg", "timestamp", "user"];
    var keysRecivied = keysRequired.filter(key => oMsg.hasOwnProperty(key));

    if (keysRecivied.length != keysRequired.length) {
      console.warning("doAddMessage(): missing parameters, \nneed:", keysRequired, "\ngot: ", keysRecivied, "\npayload:", oMsg ); return; }

    // convert unix epoch to time
    oMsg.time = (new Date(oMsg.timestamp)).toTimeString().slice(0,8); //hh:mm:ss

    var div = document.createElement("div");
    div.setAttribute("data-id", oMsg.id || "");
    div.classList.add("msg");

    switch(oMsg.event)
    {
      case 'PRIVMSG':
        div.innerHTML += `
          <div class="text">
            (${oMsg.time})
            &lt;<b>${oMsg.user}</b>&gt; ${oMsg.msg}
          </div>
        `; break;

      case 'JOIN':
        div.innerHTML += `
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> joined the chat.
          </div>
        `; break;

      case 'PART':
        div.innerHTML += `
          <div class="text">
            (${oMsg.time})
            *** <b>${oMsg.user}</b> left the chat.
          </div>
        `; break;
    } // switch end

    // remove multiple whitespaces for cleaner dom?
    div.innerHTML = div.innerHTML.replace(/(\s)+/, "$1");

    $("#searchResults").appendChild(div);
    $("#searchResults").scrollTop = $("#searchResults").scrollHeight - $("#searchResults").clientHeight;
  }
} // Dom() END

/////////////////////////////// GLOBAL ///////////////////////////
var srh, dom, db;

window.addEventListener("load", () =>
{
  $.noConflict(); // disable bootstraps jQuery

  alertify.logPosition("bottom right");
  alertify.maxLogItems(2);

  db = firebase.database();
  srh = new Search();
});

function $(str)
{
  var els = document.querySelectorAll(str);
  if (els.length === 1 && str.indexOf("#") > -1) return els[0];
  else if (els.length > 0) return Array.from(els);
  else return [];
}

HTMLElement.prototype.prepend = function(el) {
    if (this.firstChild) this.insertBefore(el, this.firstChild);
    else this.appendChild(el);
};
