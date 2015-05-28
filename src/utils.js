// utils.js
// add JS abilities within page context by injecting this script

var utils = utils || {};


utils.queryStringProcess = function(uri, delimiter) {
    var search = uri.search(true),
        output = '';
    if(search){
        for( var queryParam in search ) {
            // catch empty query parameters
            if(search[queryParam].length > 0){
                output += queryParam + delimiter + search[queryParam] + delimiter;
            }
        }
    }
    return output;
};

utils.queryStringtoPath = function(uri) {
    return utils.queryStringProcess(uri, '/') + (uri.filename() || 'index');
};

utils.queryStringtoFilename = function(uri) {
    return utils.queryStringProcess(uri, '-') + (uri.filename() || 'index');
};

// determines the path of a file based on the page's URI
utils.getFilepath = function(url, options) {
    var queryFormatters = {
        'directory': utils.queryStringtoPath,
        'filename': utils.queryStringtoFilename,
        'ignore': function() { return ''; }
    };
    var pathOptions = {
        basePath: options.basePath || '',
        queryFormat: queryFormatters[options.queryFormat] || 'directory'
    };
    var uri = URI(url),
        directory = uri.directory();
        if(directory === '/') {
            directory += (uri.filename() || 'home');
        }
        // test for query string
        if(uri.search() !== ''){
            directory += '/' + pathOptions.queryFormat(uri);
        }
        else {
            if(uri.filename()){
                directory += '/' + uri.filename();
            }
        }
        // absolute urls will already have a '/'
        if(uri.is('absolute') && pathOptions.basePath[pathOptions.basePath.length-1] === '/'){
            directory = directory.substr(1);
        }
        var filepath = pathOptions.basePath + directory;
    return filepath;
};

//move logging here