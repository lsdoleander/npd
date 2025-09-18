$(document).ready(function(){
  const template = $("#table-template").detach().html();

  $("#search").on("submit", event => {
    event.preventDefault();
    const data = $("#search").serialize();

    (async()=>{
      let results = await fetch("/search", { method: "post", body: new URLSearchParams(data) });
      if (results.length > 0) {
        $("#welcome").hide();
        let table = $(template);
        let tbody = $(table).find("tbody");
        for (let i of results) {
          tbody.attach($(`<tr>
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
        $("#results").attach(table);
      }
    })()

    return false;
  });
});