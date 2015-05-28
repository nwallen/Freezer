// crawler.js
// based on: https://gist.github.com/antivanov/3848638
// a simple phantomjs crawler that captures pages to a specified depth within a domain

(function(phantom) {

    phantom.Crawler = function(startUrl, options) {
        if(!startUrl) {
            throw new Error("Crawler(): First arg must be a URL");
        }

        // load library to normalize URLs
        phantom.injectJs('lib/uri.js');

        options = options || {};

        var crawler = {};

        crawler.options = {
            url: URI(startUrl).normalize(),
            urls: options.urls,
            logging: options.logging,
            maxDepth: options.depth,
            onStart: options.onStart || function() {},
            onEnd: options.onEnd || function() {},
            onSuccess: options.onSuccess || function() {},
            onFailure: options.onFailure || function() {},
            urlFinder: options.urlFinder || urlFinder,
            urlNormalizer: options.urlNormalizer || urlNormalizer,
            urlFilter: options.urlFilter || urlFilter,
            customFilter: options.customFilter || function() { return true; },
            waitFor: options.waitFor || function() { return true; },
            waitTimeout: options.waitTimeout || 3000,
            webSecurity: options.webSecurity,
            viewportSize: options.viewportSize
        };

        crawler.status = {
            currentDepth: 0,
            discoveredURLs: {}
        };

        crawler.logger = function(msg) {
            if(crawler.options.logging) {
                console.log(msg);
            }
        };

        crawler.queue = {
            loading: [],
            saved: []
        };

        crawler.queue.add = function(urlArray) {
            crawler.logger('ADDING NEW URLS TO QUEUE FOR NEXT DEPTH: ' + (crawler.status.currentDepth + 1) );
            crawler.queue.saved = crawler.queue.saved.concat(urlArray);
        };

        crawler.queue.nextLevel = function() {
            if(crawler.status.currentDepth === crawler.options.maxDepth) {
                crawler.logger('\n\nMAX DEPTH REACHED -- EXITING\n===========================\n\n');
                crawler.options.onEnd();
                phantom.exit();
            }
            else {
                crawler.queue.loading = crawler.queue.saved.slice();
                crawler.queue.saved = [];
                crawler.status.currentDepth ++;
                crawler.logger('\n\nSTARTING A NEW DEPTH: ' + crawler.status.currentDepth);
                crawler.queue.loadNextURL();
            }
        };

        crawler.queue.loadNextURL = function() {
            if(crawler.queue.loading.length > 0) {
                var url = crawler.queue.loading[0];
                crawler.queue.loading.splice(0, 1);
                crawler.crawl(url, crawler.queue.loadNextURL);
            }
            else {
               crawler.logger('\n\nNO URLS LEFT AT CURRENT DEPTH');
               crawler.queue.nextLevel();
            }
        };

        crawler.getURLs = function(page) {
            return crawler.options.urlFinder(page)
            .map(function(url) {
                return crawler.options.urlNormalizer(url);
            })
            .filter(function(url) {
                if(crawler.options.urlFilter(url)){
                     crawler.status.discoveredURLs[url] = true;
                     return true;
                }
            });
        };

        crawler.wait = function(testFn, page, waitOptions) {
            waitOptions = {
                maxTime: waitOptions.maxTime || crawler.options.waitTimeout,
                onPageReady: waitOptions.onPageReady || function() {},
                onWaitComplete: waitOptions.onWaitComplete || function() {}
            };
            var start = (new Date()).getTime(),
                interval = setInterval(function() {
                    var now = (new Date()).getTime();
                    if( (now - start) >= waitOptions.maxTime ) {
                        crawler.logger('PAGE READY CONDITION TIMEOUT');
                        clearInterval(interval);
                        waitOptions.onWaitComplete();
                    }
                    if( testFn(page) === true ) {
                        crawler.logger('PAGE READY CONDITION REACHED');
                        clearInterval(interval);
                        waitOptions.onPageReady();
                        waitOptions.onWaitComplete();
                    }
                }, 250);
        };

        crawler.crawl = function(url, callback) {
            var page = require('webpage').create();
            page.settings.webSecurityEnabled = crawler.options.webSecurity;
            page.viewportSize = crawler.options.viewportSize || {width: 1024, height: 768 };
            page.open(url, function(status) {
                crawler.logger('\n\nTRIED:' + url + '\nSTATUS:' + status);
                if(status === 'fail'){
                    crawler.options.onFailure({
                        url: url,
                        status: status
                    });
                    page.close();
                    callback.apply();
                    return;
                }
                crawler.wait(crawler.options.waitFor, page, {
                    onPageReady: function() {
                        if(crawler.status.currentDepth < crawler.options.maxDepth) {
                            crawler.queue.add(
                                crawler.getURLs(page)
                            );
                        }
                        else {
                            crawler.logger('MAX DEPTH REACHED -- IGNORING NEXT LEVEL OF URLS');
                        }
                        crawler.options.onSuccess({
                            url: url,
                            status: status,
                            page: page
                        });
                    },
                    onWaitComplete: function() {
                        page.close();
                        callback.apply();
                    }
                });
            });
        };

        // default helpers

        function urlFinder(page) {
            // get links from loaded page <a> elements
            return page.evaluate(function () {
                return Array.prototype.slice.call(document.querySelectorAll("a"), 0)
                    .map(function(link) {
                        return link.getAttribute("href");
                    });
            });
        }

        function urlNormalizer(url) {
            // make URL absolute and remove fragments
            if (URI(url).is("urn")) {
                return undefined;
            }
            else {
                return URI(url).normalize()
                    .absoluteTo(crawler.options.url)
                    .fragment('');
            }
        }

        function urlFilter(url) {
            // only follow URLs in the same domain and that have not been discovered
            var domain = (URI(url).domain() === URI(crawler.options.url).domain()) ? true : false,
                customTest = crawler.options.customFilter(url),
                notDiscovered = (crawler.status.discoveredURLs[url] === undefined) ? true : false;
            return domain && notDiscovered && customTest;
        }

        //init
        crawler.status.discoveredURLs[crawler.options.url] = true;
        crawler.queue.loading = [crawler.options.url];
        crawler.queue.loading = crawler.queue.loading.concat(crawler.options.urls);
        crawler.logger('\n=========================== \nSTARTING CRAWL');
        crawler.options.onStart();
        crawler.queue.loadNextURL();
        return crawler;
    };

    phantom.crawler = function(startUrl, options) {
        return new phantom.Crawler(startUrl, options);
    };

})(phantom);
