$(document).ready(function(){
  const template = $("#table-template").detach().html();
  const receipt = $("#head-template").detach().html();
  let snum = 0;

  $("#toggly").hide();

  $("#search").on("submit", event => {
    event.preventDefault();
    snum++;

    let results = [];

    (async()=>{
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

            for (let i of message.hits) {
              controls.table.append($(`<tr>
                <td>${i.first}</td>
                <td>${i.middle}</td>
                <td>${i.last}</td>
                <td>${i.suffix}</td>
                <td>${i.address}</td>
                <td>${i.city}</td>
                <td>${i.state}</td>
                <td>${i.zip}</td>
                <td>${i.phone}</td>
                <td>${i.dob}</td>
                <td>${i.altdob1}</td>
                <td>${i.ssn}</td>
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
          controls.status.html(`<a href="data:application/json;base64,${btoa(JSON.stringify(results, null, 2))}" download="npd-${snum}.json">JSON</a> | 
            <a href="data:text/csv;base64,${message.csv}" download="npd-${snum}.csv">CSV</a>`);

          $("#toggly").prop("disabled", false);
          $("#toggly").css({ opacity: 1 });
          socket.close();
        }
      })

      const data = $("#search").serialize();
      socket.send(JSON.stringify(data));
    })()

    return false;
  });
});