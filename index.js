require('dotenv').config()
var request = require('request'),
  Baby = require('babyparse'),
  cheerio = require('cheerio'),
  async = require('async'),
  aws = require('aws-sdk'),
  Baby = require('babyparse'),
  fs = require('fs'),
  shuffle = require('shuffle-array');

// Load AWS configuration
aws.config.update({region: 'us-east-1'});
s3 = new aws.S3({apiVersion: '2006-03-01'});

// Initialize message container
var messages = [];

// Begin building list of blessings and prayers
async.waterfall([
  
  
  // Time for endangered species
  function(nextScrape){
    // Open endangered species PDF
    var endangeredCSV = fs.readFileSync('./data/endangered-and-threatened.csv', 'utf8');
    Baby.parse(endangeredCSV, {
      header: true,
      complete: function(data){
        var animals = shuffle.pick( data.data, {'picks': 50} )
          .map(function(animal){ 
            if( animal['Federal Listing Status'] == 'Endangered')
              animal['status'] = 'endangered';
            else
              animal['status'] = 'threatened with extinction'

              return `Please protect the ${animal['Common Name']}, our friend among the ${animal['Species Group']}, who is ${animal.status}.`;
          })
        
          messages = messages.concat(animals);
      
          nextScrape();
      }
    })
  },
  
  // First, let's pull a random legislator
 function(nextScrape){
    // The first step in that is to grab the master list of legislative bodies
    request.get('https://raw.githubusercontent.com/everypolitician/everypolitician-data/master/countries.json', function(err, res, body){
      var countries = JSON.parse(body);
  
      var iterator = [];
      for( i=0; i<50; i++){ iterator.push(i) }
  
      async.eachSeries(iterator, function(i, nextLegislator){
        var country = countries[Math.floor(Math.random() * countries.length)]
        var legislature = country.legislatures[Math.floor(Math.random() * country.legislatures.length)]
    
        // Download list of legislators from most recent legislative session
        request.get( legislature.legislative_periods[0].csv_url, function(err, res, body){
          if(err) throw err;
          legislators = Baby.parse(body, {
            header: true
          }).data
      
          // Pull random legislator
          legislator = legislators[ Math.floor(Math.random() * legislators.length) ];
      
          // Determine gender
          if( legislator.gender == 'male' )
            gender = 'him'
          else if( legislator.gender == 'female' )
            gender = 'her'
          else gender = 'them'
      
          // Write message
          var message = `Please bless ${ legislator.name}, who serves in the ${legislature.name} of ${country.name}.`
          if( legislator.area )
            message += ` Help ${gender} lead the people of ${legislator.area} well.`
      
          messages.push(message)
          nextLegislator();
        })

      }, function(){
        nextScrape()
      })
    });
  },
  
  // Now let's add some celebrity birthdays
  function(nextScrape){
    // Grab the IMDB page
    request.get(`http://www.imdb.com/search/name?count=50&birth_monthday=${new Date().getMonth() + 1}-${new Date().getDate()}`, function(err, res, body){
      if(err) throw err;
      var $ = cheerio.load(body)
      async.each( $('td.name'), function(celebrity, nextCelebrity){ 
        var name = $(celebrity).find('a').first().text()
        var film = $(celebrity).find('.description a').text()
        var role_raw = $(celebrity).find('.description').text().replace(`, ${film}`, '')
        
        // Convert the raw roles into filtered roles
        var role_action = '';
        switch(role_raw){
          case "Actress":
            role_action = 'acting '
          break;
          
          case "Actor":
            role_action = 'acting '
          break;
          
          case "Self":
            role_action = 'acting '
          break;
          
          case "Writer":
            role_action = 'writing '
          break;
          
          case "Composer":
            role_action = 'composing '
          break;
          
          case "Music Department":
            role_action = 'musical '
          break;
          
          case "Makeup Department":
            role_action = 'makeup '
          break;
          
          case "Director":
            role_action = 'directing '
          break;
          
          case "Producer":
            role_action = 'producing '
          break;
          
          case "Casting Director":
            role_action = 'casting '
          break;  
        }
        
          messages.push(`Thank you for ${name}, and their ${role_action}work in "${film}."`)
          nextCelebrity()
      }, function(){
        nextScrape();
      })
    })
  }
], function(){
  // Upload the list of messages to AWS
  s3.upload({Bucket: 'potus-twitter', Key: 'prayerbot.json', Body: JSON.stringify(messages), ACL: 'public-read'}, function(err, data) {
    if(err) throw err;
    console.log("uploaded");  
  }); 
})
