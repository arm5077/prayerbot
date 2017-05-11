const lineInterval = 200,
  pauseInterval = 1000,
  lineWidth = 22

$.get('https://s3.amazonaws.com/potus-twitter/prayerbot.json', function(data){
  messages = JSON.parse(data);
  
  // Shuffle the messages so they're ordered differently for every user
  messages = window.knuthShuffle(messages);
  
  async.eachSeries(messages, function(message, nextMessage){ 
  
    // Split into lines 
    var lines = [];
    var words = message.split(" ")
    var line = ""
    words.forEach(function(word){
      if(line.length + word.length <= lineWidth)
        line += word + " ";
      else {
        lines.push(line);
        line = word + " ";
      }
    })

    // Sneak in that last line
    lines.push(line)

    async.eachSeries(lines, function(line, nextLine){
      $("#stream").css("transition", ((lineInterval * .8) / 1000) + "s top")
      setTimeout(function(){
        $("#stream").append("<div class='line'>" + line + "</div>")
        $("#stream").css("top", parseInt($("#stream").css("top")) - $("#stream .line").last().outerHeight(true) + "px")
        nextLine()
      }, lineInterval)  
    }, function(){
      setTimeout(function(){
        
        $("#stream").css("transition", ((lineInterval * .8) / 1000 * 3) + "s top")
        $("#stream").append("<div class='line'></div>")
        $("#stream").append("<div class='line'></div>")
        $("#stream").append("<div class='line'></div>")
        $("#stream").css("top", parseInt($("#stream").css("top")) - $("#stream .line").last().outerHeight(true) * 3 + "px")
        
        setTimeout(function(){
          nextMessage()
        }, lineInterval * 3 + pauseInterval)
      }, lineInterval)  
    })
  
  }, function(){
    console.log('done')
  });

})