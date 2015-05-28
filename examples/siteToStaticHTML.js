// siteToStaticHTML.js
// saves a (local) dynamic site as static html files
// run in the freezer directory with the command "phantomjs src/freezer.js examples/siteToStaticHTML.js"

phantom.crawler.freezer({
    // paths are relative to where you run the script 
    url: 'test/kitties/kitty-list-templated.html', // the file to start crawling from
    targetDirectory: 'siteToStaticHTML/', // the directory to put the static files in
    staticFilePath: 'test/kitties/static/', // the location of the sites static files -- will be copied and linked to by pages in the static site
    output: 'html', // save discovered pages as HTML
    queryFormat: 'filename', // append query strings to the HTML filename (e.g. 'kitten-details.html?name=lancel' to 'kitten-details-name-lancel.html')
    depth: 1, // number of hops from the starting page
    logging: true // log activity to command line
});