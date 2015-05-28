PROTOPLATE.addData('intro', {
    title: "protoplate",
    intro: (function(){
        var date = new Date();
        return "it's about " + date.getTime() + " and protoplate is still here";
    })()
});

$(document).ready( function() {
    PROTOPLATE.templater('.protoplate');
});
