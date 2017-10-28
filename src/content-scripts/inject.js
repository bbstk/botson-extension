chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
    //console.log(window.location.hostname);
  	if (document.readyState === "complete") {
  		clearInterval(readyStateCheckInterval);

      var tweetsWithLinksMap = {}

      /**
       * Start.
       */

      chrome.storage.local.get(['oauth_token', 'oauth_token_secret', 'user_id'], function(items) {
        console.log("NQKVI NESHTA");
        if (!items.oauth_token || !items.oauth_token_secret) return;

        //TODO: CALL REFRESH IF TWITTER, STH ELSE IF FACEBOOK
        refresh(items);
        setInterval(function() { return refresh(items) }, 5000);
      });

      /**
       * Refresh when new tweets appear in DOM.
       */

      function refresh(auth) {
        var users = formatUsers(getUsersFromTimeline());

        //Get all tweets with links from timeline
        var tweetsWithLinks = getTweetsWithLinks();

       // //console.log("TWEETS WITH LINKS: " + tweetsWithLinks)

        for (var i = 0; i < tweetsWithLinks.length; i++) {
          //console.log("Tweet id: ", tweetsWithLinks[i].id)
          //console.log("Tweet link: ", tweetsWithLinks[i].link)
          //console.log("Tweet score: ", tweetsWithLinks[i].score)
          if(tweetsWithLinksMap[tweetsWithLinks[i].id].score) continue;
          getLinkScore(tweetsWithLinks[i]);
        }

        if (users.length > 10) {
          for (var i = 0; i < users.length; i++) {
            getScore(users[i], auth);
          }
        }
        update();
        updateFakeNews();
      }

      /**
       * Get tweets with links from timeline
       * For your sanity don't go into the rabbithole below 
       */

      function getTweetsWithLinks() {
        var tweets = document.querySelectorAll('div.tweet');
        var tweetsLink = [];
        for (var i = 0; i < tweets.length; i++) {
          if (tweets[i].getAttribute('link-data-scraped') === 'true') continue;
          var tweet_id = tweets[i].getAttribute('data-tweet-id');
          if (tweetsWithLinksMap[tweet_id]) continue;

          var link = ""

          var fieldContainingLink = tweets[i].getElementsByClassName('js-tweet-text-container');
          //console.log(fieldContainingLink);
          if (fieldContainingLink === undefined) {
            continue;
          } 
          for (var k = 0; k< fieldContainingLink.length; k++) {
            var children = fieldContainingLink[k].getElementsByTagName('A');
            //console.log("Children === undefined: " + (children === undefined));
            if (children === undefined) {
              continue;
            }
            //console.log("Children len: " + children.length);
            for (var j = 0; j < children.length; j++) {
              temp = children[j].getAttribute('data-expanded-url');
              //console.log("Temp: " + temp)
              if (temp != undefined && temp != "") {
                link = temp;
                break;
              }
            }
            if (link != undefined && link != "") break;
          }
          if (link == undefined || link == "") continue;
          var entity = {};
          entity["id"] = tweet_id;
          entity["link"] = link;
          tweetsLink.push(entity);
          tweetsWithLinksMap[tweet_id] = entity;
          tweets[i].setAttribute('link-data-scraped', 'true');
        }
        return tweetsLink;
      }

      /**
       * Get users dictionary from timeline.
       */

      function getUsersFromTimeline() {
        var tweets = document.querySelectorAll('div.tweet');
        var users = {};
        for (var i = 0; i < tweets.length; i++) {
          if (tweets[i].getAttribute('data-scraped') === 'true') continue;
          var user_id = tweets[i].getAttribute('data-user-id');
          var screen_name = tweets[i].getAttribute('data-screen-name');
          if (!user_id || !screen_name) continue;
          if (users[user_id]) continue;
          users[user_id] = screen_name;
          tweets[i].setAttribute('data-scraped', 'true');
        }
        return users;
      }

      /**
       * Get bot score for user.
       * @param {Object} user { user_id: Number, screen_name: String }
       * @param {Object} auth { oauth_token: String, oauth_token_secret: String }
       */

      function getScore(user, auth) {
        // var xhttp = new XMLHttpRequest();
        // xhttp.open('POST', 'https://askbotson.herokuapp.com/api/', true);
        // xhttp.setRequestHeader("Content-Type", "application/json");
        // xhttp.setRequestHeader("x-twitter-oauth-token", auth.oauth_token);
        // xhttp.setRequestHeader("x-twitter-oauth-secret", auth.oauth_token_secret);
        // if (auth.user_id) xhttp.setRequestHeader("x-twitter-user-id", auth.user_id);
        // xhttp.send(JSON.stringify(user));
        // xhttp.onload = saveUsers;
      }

      /**
       * Get the fake news score of the link in a tweet
      */

      function getLinkScore(tweet) {
        //TODO: prati na dani malko post requestche
        var xhttp = new XMLHttpRequest();
        xhttp.open('POST', 'https://d69c1b32.ngrok.io/vanko_mock', true);
        xhttp.setRequestHeader("Content-Type", "application/json");
       //TODO:UNCOMMENT -> xhttp.send(JSON.stringify(tweet));
        

        mockNaDaniNeshtoto(tweet)
        
        //TODO: UNCOMMENT TO WORK
       // xhttp.onload = saveTweetsWithLinks;
      }

      function mockNaDaniNeshtoto(tweet) {
        tweetsWithLinksMap[tweet.id] = {id: tweet.id, link: tweet.link, score: 0.8}
      }

      //Update the tweets map
      function saveTweetsWithLinks(e) {
        var res = JSON.parse(e.target.response); 
        //console.log("Received response from dani banani: " + res);
        tweetsWithLinksMap[res.id] = {id: res.id, link: res.link, score: res.score}
        //console.log(JSON.stringify(tweetsWithLinksMap[res.id]));
      }

      /**
       * Update users.
       */

      function saveUsers(e) {
        var res = JSON.parse(e.target.response);
        chrome.storage.local.get(null, function(items) {
          if (items[res.user_id]) return;
          items[res.user_id] = { screen_name: res.screen_name, score: res.scores.english };
          chrome.storage.local.set(items);
        });
      }

      /**
       * Update dom with data.
       */

      function update() {
        var tweets = document.querySelectorAll('div.tweet');
        chrome.storage.local.get(null, function(items) {
          var users = items;
          for (var i = 0; i < tweets.length; i++) {
            for (var userId in users) {
              if (!users[userId].score || !users[userId].screen_name) continue;
              if (tweets[i].getAttribute('data-user-id') !== userId.toString()) continue;
              if (tweets[i].getAttribute('data-bot-score')) continue;
              tweets[i].setAttribute('data-bot-score', users[userId].score);
            }
          }
          updateUI(items.threshold);
        });
      }

      /**
       * Update dom with data considering the fake news api
       */
      function updateFakeNews() {
        //console.log("Updating fake news...");
        var tweets = document.querySelectorAll('div.tweet');
        //console.log("Tweets i can see on the timeline: " + tweets.length);
        for (var i = 0; i < tweets.length; i++) {
          //console.log("tweetsWithLinksMap: " + JSON.stringify(tweetsWithLinksMap))
          for (var property in tweetsWithLinksMap) {
            //console.log("Property: ", property);
            if (tweetsWithLinksMap.hasOwnProperty(property)) {
              //console.log("Inside the map...");
              if (!tweetsWithLinksMap[property].score) continue;
              if (tweets[i].getAttribute('data-tweet-id') !== property.toString()) continue;
              if (tweets[i].getAttribute('data-link-score')) continue;
              //console.log("----SETTING ATTRIBUTE for id: " + property)
              tweets[i].setAttribute('data-link-score', tweetsWithLinksMap[property].score);
            }
          }
        }
        
        updateUIFakeNews(0.01);
      }

      /**
       * Update dom UI for fake news.
       */

      function updateUIFakeNews(threshold) {
        threshold = threshold || 0.6;
        var tweets = document.querySelectorAll('div.tweet');
        for (var i = 0; i < tweets.length; i++) {
          toggleTweetUIFakeNews(tweets[i], threshold);
        }
      }

      /**
       * Toggle Fake News UI for tweet.
       */
      function toggleTweetUIFakeNews(tweet, threshold) {
        var score = tweet.getAttribute('data-link-score');
        //console.log("Score in ui: " + score)
        var screen_name = tweet.getAttribute('data-screen-name');
        //if (true) {
        if (score > threshold && !tweet.getAttribute('user-revealed')) {
          //console.log("Inside the changing of the css.")
         // if (true) tweet.className += ' probably-a-bot';
          //if (true) tweet.parentNode.insertBefore(createMask({ score: score, screen_name: screen_name }, tweet.scrollHeight), tweet);
          if (!tweet.classList.contains('probably-a-bot')) tweet.className += ' probably-a-bot';
          if (!tweet.parentNode.querySelector('.probably-a-bot-mask')) tweet.parentNode.insertBefore(createFakeNewsMask({ score: score, screen_name: screen_name }, tweet.scrollHeight), tweet);
        } else {
          tweet.classList.remove('probably-a-bot');
          if (tweet.parentNode.querySelector('.probably-a-bot-mask')) tweet.parentNode.querySelector('.probably-a-bot-mask').remove();
        }
      }

      /**
       * Update dom UI.
       */

      function updateUI(threshold) {
        threshold = threshold || 0.6;
        var tweets = document.querySelectorAll('div.tweet');
        for (var i = 0; i < tweets.length; i++) {
          toggleTweetUI(tweets[i], threshold);
        }
      }

      /**
       * Toggle UI for tweet.
       */
      function toggleTweetUI(tweet, threshold) {
        // var score = tweet.getAttribute('data-bot-score');
        // var screen_name = tweet.getAttribute('data-screen-name');
        // if (score > threshold && !tweet.getAttribute('user-revealed')) {
        //   if (!tweet.classList.contains('probably-a-bot')) tweet.className += ' probably-a-bot';
        //   if (!tweet.parentNode.querySelector('.probably-a-bot-mask')) tweet.parentNode.insertBefore(createMask({ score: score, screen_name: screen_name }, tweet.scrollHeight), tweet);
        // } else {
        //   tweet.classList.remove('probably-a-bot');
        //   if (tweet.parentNode.querySelector('.probably-a-bot-mask')) tweet.parentNode.querySelector('.probably-a-bot-mask').remove();
        // }
      }

      /**
       * On slider change, then update UI.
       */

      chrome.storage.onChanged.addListener(function(changes, namespace) {
        for (key in changes) if (key === 'threshold' && changes.threshold.newValue) updateUI(changes.threshold.newValue);
      });

      /**
       * Create mask and message div.
       */

      function createMask(user, height) {
        var mask = document.createElement('div');
        var message = document.createElement('div');
        mask.className = 'probably-a-bot-mask';
        message.className = 'probably-a-bot-mask-message-short';
        if (height > 150) message.className = 'probably-a-bot-mask-message-medium';
        if (height > 300) message.className = 'probably-a-bot-mask-message-tall';
        message.innerHTML = 'We are ' + Math.round(100 * user.score) + '% confident that this tweet is from a bot.';
        message.innerHTML += '<p style="font-size: 0.8rem"><a href="#/" class="reveal-tweet">Reveal tweet</a>. <a href="https://botometer.iuni.iu.edu/#!/?sn=' + user.screen_name + '" target="_blank">Learn more about this account</a>.</p>';
        mask.appendChild(message);
        message.childNodes[1].childNodes[0].addEventListener('click', function(e) {
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].classList.remove('probably-a-bot');
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].setAttribute('user-revealed', true);
          this.parentNode.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode.parentNode);
        });
        return mask;
      }

       /**
       * Create mask and message div.
       */

      function createFakeNewsMask(user, height) {
        var mask = document.createElement('div');
        var message = document.createElement('div');
        mask.className = 'probably-a-bot-mask';
        message.className = 'probably-a-bot-mask-message-short';
        if (height > 150) message.className = 'probably-a-bot-mask-message-medium';
        if (height > 300) message.className = 'probably-a-bot-mask-message-tall';
        message.innerHTML = 'We are ' + Math.round(100 * user.score) + '% confident that this tweet contains fake news.';
        message.innerHTML += '<p style="font-size: 0.8rem"><a href="#/" class="reveal-tweet">Reveal tweet</a>. <a href="https://botometer.iuni.iu.edu/#!/?sn=' + user.screen_name + '" target="_blank">Learn more about this account</a>.</p>';
        mask.appendChild(message);
        message.childNodes[1].childNodes[0].addEventListener('click', function(e) {
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].classList.remove('probably-a-bot');
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].setAttribute('user-revealed', true);
          

          var para = document.createElement("a");
          var node = document.createTextNode("If you think the tweet below is actually real news click here and we'll improve our algorithm.");
          para.appendChild(node);
          console.log(this.parentNode.parentNode.parentNode.parentNode.childNodes[2]);
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].insertBefore(para, this.parentNode.parentNode.parentNode.parentNode.childNodes[2].firstChild);


          this.parentNode.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode.parentNode);
        });
        return mask;
      }

      /**
       * Format user dictionary into tiny pieces.
       */

      function formatUsers(users) {
        var arr = [];
        for (var property in users) {
          if (users.hasOwnProperty(property)) {
            if (property) arr.push({ user_id: '' + property, screen_name: users[property] });
          }
        }
        return arr;
      }
  	}
	}, 10);
});



