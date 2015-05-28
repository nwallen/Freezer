// siteScreenCapture.js
// crawls a site, captures screens and produces a csv
// run in the freezer directory with the command "phantomjs src/freezer.js examples/siteScreenCapture.js"

var frozenPages = []; 
var targetDirectory = 'siteScreenCapture/';
var subDirectory = 'leadership-calendar';

phantom.crawler.freezer({
    url: 'http://www.consumerfinance.gov/' + subDirectory + '/', // url to start the crawl from
    targetDirectory: targetDirectory, // where to save the captures (relative to location the script is run from)
    output:'image', // save pages as images
    depth: 30, // number of hops crawler should make from starting page
    logging: true, // show logging messages on the command line
    customFilter: function(url) {

        // custom test for each URL the crawler finds
        // return true to use the URL or false to reject
        // this filter rejects URLs outside of the specified subdirectory

        return (URI(url).segment(0) === subDirectory) ? true : false;
    },
    onOutput: function(path, result) {

        // on each page get the needed data from the 
        // page object and save to an array of objects

        var uri = new URI(result.page.url),
            urlSegments = uri.segment();
        var directoryGroup = 'root';

        // treat query string as one level

        if(uri.search()) {
            urlSegments.push(urlSegments[urlSegments.length-1]);
        }

        // group by first directory

        if(urlSegments.length >= 2) {
            directoryGroup = urlSegments[0];
        }

        // append page data to array

        frozenPages.push({
            title: '"' + result.page.title + '"', 
            url:  '"' + result.page.url + '"',
            screenshot: '"' + path + '"' ,
            urlDepth: urlSegments.length,
            directoryGroup: directoryGroup
        });
    },
    onEnd: function() {

        // no more pages to crawl
        // save captured data as a .csv file

        var fs = require('fs');
        var csv = ConvertToCSV(JSON.stringify(frozenPages));
        fs.write((targetDirectory + '/missedPageList.csv'), csv, 'a');
    }
});

// helper
// http://stackoverflow.com/questions/11257062/converting-json-object-to-csv-format-in-javascript

function ConvertToCSV(objArray) {
    var array = typeof objArray != 'object' ? JSON.parse(objArray) : objArray;
    var str = '';
    var header = '';
    for (var i = 0; i < array.length; i++) {
        var line = '';
        for (var index in array[i]) {
            if (line !== '') line += ',';
            if (i === 0) {
                header += index + ',';
            }
            line += array[i][index];
        }
        str += line + '\r\n';
    }
    return header + '\r\n' + str;
}