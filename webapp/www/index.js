$(document).ready(function(){
  const template = $("#table-template").detach().html();
  const receipt = $("#head-template").detach().html();

  let inprogress = false;
  let snum = 0;

  function cereal(){
    var formDataArray = $('#search').serializeArray();
    var formObject = {};
    $.each(formDataArray, function() {
        if (formObject[this.name]) {
            if (!Array.isArray(formObject[this.name])) {
                formObject[this.name] = [formObject[this.name]];
            }
            formObject[this.name].push(this.value || '');
        } else {
            formObject[this.name] = this.value || '';
        }
    });
    return formObject;
  }


  async function search(){
    inprogress = true;
    snum++;

    let results = [];
    let $body = $(template);
    $("#results").append($body);
    $("#welcome").detach();
    $body.find(".snum").text(snum);
    $("#toggly").show();
    $("#toggly").prop("disabled", true);
    $("#toggly").css({ opacity: 0.5 });

    const controls = {
      progress: $body.find(".progress"),
      status: $body.find(".status"),
      bar: $body.find(".progress-bar"),
      table: $body.find("tbody")
    }

    const socket = new WebSocket("/search");
    socket.addEventListener("message", function(event){
      let message = JSON.parse(event.data);
      if (!message.final) {
        if (message.hits) {
          results = [ ...results, ...message.hits ];

          const R={
            PH: /(\d{3})(\d{3})(\d{4})/,
            DOB: /(\d{4})(\d{2})(\d{2})/,
            SSN: /(\d{3})(\d{2})(\d{4})/
          }

          function _ph_(p) {
            return R.PH.test(p) ? p.replace(R.PH, `($1) $2-$3`):""
          }
          function _dob_(d) {
            return R.DOB.test(d) ? d.replace(R.DOB, `$2/$3/$1`):""
          }
          function _ssn_(s) {
            return R.SSN.test(s) ? s.replace(R.SSN, `$1 $2 $3`):""
          }

          for (let i of message.hits) {
            controls.table.append($(`<tr>
              <td>${i.first||""}</td>
              <td>${i.middle||""}</td>
              <td>${i.last||""}</td>
              <td>${i.suffix||""}</td>
              <td>${i.address||""}</td>
              <td>${i.city||""}</td>
              <td>${i.state||""}</td>
              <td>${i.zip||""}</td>
              <td>${_ph_(i.phone)}</td>
              <td>${_dob_(i.dob)}</td>
              <td>${_dob_(i.altdob1)}</td>
              <td class="ssn" data="${i.ssn}">${_ssn_(i.ssn)}</td>
            </tr>`));
          }
        }
        let percent = Math.round((message.status.done / message.status.total) * 100);
        controls.progress.attr("aria-valuenow", percent);
        controls.bar.css({ width: `${percent}%` });
        if (percent >= 10) {
          controls.bar.text(`${percent} %`);
        }
      } else {
        if (results.length > 0 && message.csv) {
          controls.status.html(`<a href="data:application/json;base64,${btoa(JSON.stringify(results, null, 2))}" download="npd-${snum}.json">JSON</a> | 
            <a href="data:text/csv;base64,${message.csv}" download="npd-${snum}.csv">CSV</a>`);
        } else {
          controls.status.html("N/A");
        }
        $("#toggly").prop("disabled", false);
        $("#toggly").css({ opacity: 1 });\

        controls.table.find("td.ssn").on("click", event=>{
          search({ 
            ssn: $(event.target).attr("data")
          })
        })

        socket.close();
        inprogress = false;
      }
    })

    socket.addEventListener("open", function(event){
      if (!inprogress) socket.send(JSON.stringify(data));
    })
  }


  $("#toggly").hide();

  $("#search").on("submit", event => {
    event.preventDefault();
    if (!inprogress) {
      const data = cereal();
      $("#search").reset();
      search(data);
    }
    return false;
  });
});