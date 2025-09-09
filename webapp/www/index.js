$(document).ready(function(){
  const template = $("#table-template").detach().html();

  $("#search").on("submit", event => {
    event.preventDefault();
    
    (async()=>{
      let results = await fetch("/search", { data: $(this).serialize() });
      if (results.length > 0) {
        $("#welcome").hide();
        let table = $(template);
        let tbody = $(table).find("tbody");
        for (let i of results) {
          tbody.attach($(`<tr>
            <td>${i.since}</td>
            <td>${i.first}</td>
            <td>${i.middle}</td>
            <td>${i.last}</td>
            <td>${i.address}</td>
            <td>${i.city}</td>
            <td>${i.state}</td>
            <td>${i.zip}</td>
            <td>${i.phone}</td>
            <td>${i.dob}</td>
            <td>${i.ssn}</td>
          </tr>`));
        }
        $("#results").attach(table);
      }
    })()

    return false;
  });
});