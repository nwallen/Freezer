// freezer.js
// create static pages from dynamic pages

(function(phantom) {

    phantom.injectJs('crawler.js');

    phantom.crawler.Freezer = function(options) {
        if(!options.url) {
            throw new Error("Freezer(): First arg must be an object with a 'url' property");
        }
        if(!options.output) {
            throw new Error("Freezer(): First arg must be an object with a 'output' property");
        }
         if(!options.depth && options.depth !== 0) {
            throw new Error("Freezer(): First arg must be an object with a 'depth' property");
        }

        var freezer = {};

        freezer.fs = require('fs');

        freezer.getFilepath = function(url) {
          // use the same script that will be injected into page to determine the filepath
          phantom.injectJs('utils.js');
          return utils.getFilepath(url, {basePath: freezer.options.targetDirectory, queryFormat: freezer.options.queryFormat});
        };

        freezer.copyStaticFiles = function() {
            var orgPath = freezer.options.staticFilePath;
            var targetPath = freezer.options.targetDirectory + freezer.options.staticFilePath;
            if(!freezer.fs.exists(orgPath) || freezer.fs.exists(targetPath)) {
                return;
            }
            // write a dummy file to the target path 
            freezer.fs.write(targetPath + 'static.txt', '', 'w');
            // otherwise, you get write errors on copyTree
            freezer.fs.copyTree(orgPath, targetPath);
        };

        freezer.updatePageLinks = function(page) {
            page.injectJs('lib/uri.js');
            page.injectJs('lib/jquery-2.0.0.min.js');
            page.injectJs('utils.js');
            // all this JS runs sandboxed in the loaded page
            page.evaluate(function(startingDirectory, queryFormat) {
                $jq = window.jQuery;
                $jq.noConflict();
                // determine the absolute directory path for the root of the site and the current page
                var basePath = new URI(startingDirectory).directory(),
                    pagePath = new URI(utils.getFilepath((window.location.pathname + window.location.search), {queryFormat: queryFormat})),
                    // determine the relative path from this page to the site root
                    relativeToBase = new URI(basePath).relativeTo(pagePath.directory()).directory();
                    if(relativeToBase.length > 0) {
                        relativeToBase += '/';
                    }
                // update links to other pages
                $jq('a').each(function() {
                    var url = $jq(this).attr('href'),
                        linkPath = new URI(utils.getFilepath(url, {basePath: basePath, queryFormat: queryFormat}));
                    if(new URI(url).is('absolute')) {
                        return;
                    }
                    $jq(this).attr('href', linkPath.relativeTo(pagePath));
                });
                // update relative static file links
                $jq('link').each(function(){
                    // static files are accessed in the root of the static site
                    var cssPath = $jq(this).attr('href');
                    if(new URI(cssPath).is('absolute')) {
                        return;
                    }
                    $jq(this).attr('href', relativeToBase + cssPath);

                });
                $jq('script').each(function(){
                    // static files are accessed in the root of the static site
                    var scriptPath = $jq(this).attr('src');
                    if(new URI(scriptPath).is('absolute')) {
                        return;
                    }
                    $jq(this).attr('src', relativeToBase + scriptPath);

                });
            }, freezer.fs.absolute(freezer.options.url), freezer.options.queryFormat);
        };

        freezer.saveStaticPage = function(result) {
            // order matters: create directory and move static files > update links > write page
            freezer.copyStaticFiles();
            freezer.updatePageLinks(result.page);
            var path = freezer.getFilepath(result.url);
            freezer.fs.write(path, result.page.content, 'w');
            freezer.options.onOutput(path, result);
        };

        freezer.saveImage = function(result) {
            var path = freezer.getFilepath(result.url) + '.png';
            result.page.clipRect = freezer.options.captureBox;
            result.page.render(path);
            freezer.options.onOutput(path, result);
        };

        freezer.waitFor = function(page) {
            return true;
        };

        freezer.outputs = {
            'image': freezer.saveImage,
            'html': freezer.saveStaticPage
        };

        freezer.options = {
            url: options.url,
            output: freezer.outputs[options.output],
            onOutput: options.onOutput || function(result, path) {},
            targetDirectory: options.targetDirectory,
            staticFilePath: options.staticFilePath,
            queryFormat: options.queryFormat || 'directory',
            captureBox: options.captureBox || { top: 0, left: 0, width: 1024, height: 1200 }
        };

        freezer.crawlerSettings = {
            depth: options.depth,
            logging: options.logging,
            urls: options.urls,
            webSecurity: options.webSecurity,
            viewportSize: options.viewportSize || { width: 1024, height: 768 },
            waitFor: options.waitFor || freezer.waitFor,
            onStart: options.onStart || function() {},
            onEnd: options.onEnd || function() {},
            onSuccess: freezer.options.output,
            waitTimeout: options.waitTimeout,
            customFilter: options.customFilter
        };

        phantom.crawler(freezer.options.url, freezer.crawlerSettings);

        return freezer;
    };

    phantom.crawler.freezer = function(options) {
        return new phantom.crawler.Freezer(options);
    };

    var args = require('system').args;
    if(!args[1]) {
        console.log('Usage: freezer.js <freezerscript.js>');
        phantom.exit();
    }
    else {
        phantom.injectJs(args[1]);
    }

})(phantom);
