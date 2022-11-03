/*
ENDPOINTS

https://github.com/npm/registry/blob/master/docs/download-counts.md

Total downloads

GET https://api.npmjs.org/downloads/point/{period}[/{package}]
 
Downloads Range

GET https://api.npmjs.org/downloads/point/{range}[/{package}]
 

All packages, last day:
    /downloads/point/last-day
All packages, specific date:
    /downloads/point/2014-02-01
Package "express", last week:
    /downloads/point/last-week/express
Package "express", given 7-day period:
    /downloads/point/2014-02-01:2014-02-08/express
Package "@slack/client", last 30 days:
    /downloads/point/last-month/@slack/client
Package "jquery", specific month:
    /downloads/point/2014-01-01:2014-01-31/jquery

Parameters

Acceptable values are:

last-day
    Gets downloads for the last available day. In practice, this will usually be "yesterday" (in GMT) but if stats for that day have not yet landed, it will be the day before.
last-week
    Gets downloads for the last 7 available days.
last-month
    Gets downloads for the last 30 available days.
    
Output

The following incredibly simple JSON is the output:

{
  downloads: 31623,
  start: "2014-01-01",
  end: "2014-01-31",
  package: "jquery"
}

If you have not specified a package, that key will not be present. The start and end dates are inclusive.
Ranges

Gets the downloads per day for a given period, for all packages or a specific package.

GET https://api.npmjs.org/downloads/range/{period}[/{package}]
Examples

Downloads per day, last 7 days
    /downloads/range/last-week
Downloads per day, specific 7 days
    /downloads/range/2014-02-07:2014-02-14
Downloads per day, last 30 days
    /downloads/range/last-month/jquery
Downloads per day, specific 30 day period
    /downloads/range/2014-01-03:2014-02-03/jquery

Parameters

Same as for /downloads/point.
Output

Responses are very similar to the point API, except that downloads is now an array of days with downloads on each day:

{
  downloads: [
    {
      day: "2014-02-27",
      downloads: 1904088
    },
    ..
    {
      day: "2014-03-04",
      downloads: 7904294
    }
  ],
  start: "2014-02-25",
  end: "2014-03-04",
  package: "somepackage"
}

As before, the package key will not be present if you have not specified a package.
Bulk Queries

To perform a bulk query, you can hit the range or point endpoints with a comma separated list of packages rather than a single package, e.g.,

/downloads/point/last-day/npm,express

Important: Scoped packages are not yet supported in bulk queries. So you cannot request /downloads/point/last-day/@slack/client,@iterables/map yet.
Limits

Bulk queries are limited to at most 128 packages at a time and at most 365 days of data.

All other queries are limited to at most 18 months of data. The earliest date for which data will be returned is January 10, 2015.
Per version download counts

Download count for specific versions of a package are only available for the previous 7 days. They have a unique API end point

GET https://api.npmjs.org/versions/{package}/last-week

Note: for scoped packages, the / needs to be percent encoded. (@slack/client -> @slack%2Fclient).
Examples

/versions/fastify/last-week
/versions/@slack%2Fclient/last-week

*/

const YYYY_MM_DD = (date) => {

  if (date instanceof Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();

    return year + "-" + month + "-" + day;
  }
}



const fetchPublishedPackages = async (author) => {
  //https://registry.npmjs.com/-/v1/search?text=author:<name>
  try {
    const response = await fetch("https://registry.npmjs.com/-/v1/search?text=author:" + author);
    const data = await response.json();
    const packages = data.objects.map((pack) => pack.package.name);
    return packages;
  } catch (e) {
    console.error(e);
  }

}

const npmStats = async (packages) => {

  const start = '2022-01-01';
  const end = YYYY_MM_DD(new Date());

  const fullperiod = start + ":" + end;
  const packageList = typeof packages == 'string' ? packages : packages.join(",");

  const periods = ["last-day", "last-week", "last-month", "total", "range"];
  let url;
  let resultData = {};

  for (let period of periods) {

    if (period == 'total') {
      url = "https://api.npmjs.org/downloads/point/" + fullperiod + "/" + packageList;
    } else if (period == 'range') {
      url = "https://api.npmjs.org/downloads/range/" + fullperiod + "/" + packageList;
    } else {
      url = "https://api.npmjs.org/downloads/point/" + period + "/" + packageList;
    }

    try {
      const response = await fetch(url);
      const data = await response.json();

      resultData[period] = data;

    } catch (e) {
      console.error(e);
    }
  }

  return resultData;
}

function renderView(obj, packages) {

  let mainContent = "";

  for (let pack of packages) {

    let lastDay = obj['last-day'][pack].downloads;
    let lastWeek = obj['last-week'][pack].downloads;
    let lastMonth = obj['last-month'][pack].downloads;
    let total = obj['total'][pack].downloads;

    mainContent += `
    <!--<h2><span class ="package">${pack}</span></h2>-->
    <div class="panel">   
    <div id="${pack}" class = "plot">
    </div>
    <div class="packdetails">
    <table>
    <tbody>
    <tr>
    <td>Last Day</td>
    <td><span class ="lastday"><b>${lastDay}</b></span></td>
    </tr>
    <tr>
    <td>Last Week</td>
    <td><span class ="lastweek"><b>${lastWeek}</b></span></td>
    </td>
    </tr>
    <tr>
    <td>Last Month</td>
    <td><span class ="lastmonth"><b>${lastMonth}</b></span></td>
    </tr>
    <tr>
    <td>Total</td>
    <td><span class ="total"><b>${total}</b></span></td>
    </tr>
    </tbody>
    </table>
    </div>
    </div>`;
  }

  return mainContent;

}

const setPlotData = (data, packages) => {

  const range = data.range;
  const allPackages = [];

  for (let pack of packages) {
    const el = document.getElementById(pack);
    const day = range[pack]["downloads"].map(obj => obj.day);
    const downloads = range[pack]["downloads"].map(obj => obj.downloads);

    const plotData = [{
      x: day,
      y: downloads,
      mode: 'lines',
      type: 'scatter',
      line: { color: "#05a595", shape: 'spline' }
    }];

    allPackages.push({
      x: day, y: downloads,
      mode: 'lines',
      name: pack,
      line: { shape: 'spline' },
      type: 'scatter'
    });

    const layout = {
      title: pack,
      margin: 50,
      xaxis: {
        showgrid: false
      },
      yaxis: {
        showgrid: false,
        showline: true
      }
    };
    const config = {};

    Plotly.newPlot(el, plotData, layout, config);
  }

  Plotly.newPlot(document.getElementById("allpackages"), allPackages, {
    title: "All Packages",
    margin: 50,
    xaxis: {
      showgrid: false
    },
    yaxis: {
      showgrid: false,
      showline: true
    }

  }, {});
}


(async function main() {

  try {

    const packages = await fetchPublishedPackages("grjan7npm");
    const downloads = await npmStats(packages);
    const view = renderView(downloads, packages);
    const mainDiv = document.getElementById("main");

    mainDiv.innerHTML = view;
    setPlotData(downloads, packages);

  } catch (e) {
    console.error(e);
  }

})();


