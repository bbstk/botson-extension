chrome.extension.sendMessage({}, function(response) {
	var readyStateCheckInterval = setInterval(function() {
  	if (document.readyState === "complete") {
  		clearInterval(readyStateCheckInterval);

      var tweetsWithLinksMap = {};
      var storiesWithLinksMap = {};
      var FBID = 1;
      /**
       * Start.
       */

      chrome.storage.local.get(['oauth_token', 'oauth_token_secret', 'user_id'], function(items) {
        //console.log("NQKVI NESHTA");


        if (!items.oauth_token || !items.oauth_token_secret) return;

        //TODO: CALL REFRESH IF TWITTER, STH ELSE IF FACEBOOK
        if (window.location.hostname === "twitter.com") {
          //console.log("It's a twitter show.");
          refresh(items);
          setInterval(function() { return refresh(items) }, 10000);
        } else if (window.location.hostname === "www.facebook.com") {
          //console.log("It's a facebook show");
          refreshFb();
          setInterval(function() { return refreshFb() }, 5000);
        }
      });

      function refreshFb() {
        var stories = document.querySelectorAll('.fbUserStory');

        var storiesWithLinks = getStoriesWithLinks();

        for (var i = 0; i < storiesWithLinks.length; i++) {
          if(storiesWithLinksMap[storiesWithLinks[i].id].score) {
            continue;
          }
          getLinkScoreFB(storiesWithLinks[i]);
        }

        updateFakeNewsFB();
      }

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
          //console.log("SCORE: ", tweetsWithLinksMap[tweetsWithLinks[i].id].score)
          //console.log("CURRENT ID: ", tweetsWithLinks[i].id)
          //console.log("STRINGIFY OBEJCT WITH CURRENT ID: ", JSON.stringify(tweetsWithLinksMap[tweetsWithLinks[i].id]))
          if(tweetsWithLinksMap[tweetsWithLinks[i].id].score) {
            //console.log("SKIPVAM TOVA DA PRASHTAM REQUESTI NA MALKIQ DANI!")
            continue;
          }
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
          //console.log("tweet_id: ", (tweet_id == null));
          if (tweet_id == null) continue;
          //console.log("ID: " + tweet_id.toString());
          //console.log("SHOULD BE HERE: " + JSON.stringify(tweetsWithLinksMap));

          if (tweetsWithLinksMap.hasOwnProperty(tweet_id)){ 
            console.log("Should continue sometimes pls");
            continue;
          }

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
          //console.log(tweets[i].getElementsByClassName('username')[0].getElementsByTagName('b')[0].innerHTML);
          entity["user"] = tweets[i].getElementsByClassName('username')[0].getElementsByTagName('b')[0].innerHTML;
          tweetsLink.push(entity);
          tweetsWithLinksMap[tweet_id] = entity;
          tweets[i].setAttribute('link-data-scraped', 'true');
        }
        return tweetsLink;
      }

      function getStoriesWithLinks() {
        var stories = document.querySelectorAll('.fbUserStory');
        var storiesLinks = [];
        for (var i= 0; i < stories.length; i++) {
          if (stories[i].getAttribute('fake-id')) continue;
          stories[i].setAttribute('fake-id', FBID);
          var fb_id = FBID;
          FBID ++;
          var link = ""
          var fieldsContainingLink = stories[i].getElementsByClassName('_6ks');
          if (fieldsContainingLink === undefined) continue;
          for (var k = 0; k<fieldsContainingLink.length; k++) {
            var children = fieldsContainingLink[k].firstElementChild;
            //console.log(fieldsContainingLink[k].getElementsByTagName('a'));
            if (children === undefined) continue;
           // for (var j = 0; j < children.length; j++) {
              if (children.href == null ) {//|| children.href.includes("l.facebook.com")) {
                //console.log("Skipped: " + children);
                continue;
              }
              temp = children.href
              if (temp != undefined && temp != "") {
                link = temp;
                break;
              }
           // }
            if (link != undefined && link != "") break;
          }
          if (link == undefined || link == "") continue;
          var entity = {};
          entity["id"] = fb_id;
          entity["link"] = link;
          storiesLinks.push(entity);
          storiesWithLinksMap[fb_id] = entity;
        }
        return storiesLinks;
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
        var xhttp = new XMLHttpRequest();
        xhttp.open('POST', 'https://d69c1b32.ngrok.io/check_url', true);
        xhttp.setRequestHeader("Content-Type", "application/json");
        xhttp.send(JSON.stringify(tweet));
        

        //mockNaDaniNeshtoto(tweet)
        
        //TODO: UNCOMMENT TO WORK
       xhttp.onload = saveTweetsWithLinks;
      }

      function getLinkScoreFB(story) {
        var xhttp = new XMLHttpRequest();
        xhttp.open('POST', 'https://d69c1b32.ngrok.io/check_url', true);
        xhttp.setRequestHeader("Content-Type", "application/json");
        //xhttp.send(JSON.stringify(story));
        

        mockNaDaniNeshtotoFB(story)
        
        //TODO: UNCOMMENT TO WORK
       //xhttp.onload = saveStoriesWithLinks;
      }

      function mockNaDaniNeshtotoFB(story) {
        storiesWithLinksMap[story.id] = {id: story.id, link: story.link, score: 0.8}
      }

      function mockNaDaniNeshtoto(tweet) {
        tweetsWithLinksMap[tweet.id] = {id: tweet.id, link: tweet.link, score: 0.8}
      }

      //Update the tweets map
      function saveTweetsWithLinks(e) {
        var res = JSON.parse(e.target.response); 
        console.log("user score: " + res.user_score);
        tweetsWithLinksMap[res.id] = {id: res.id, link: res.link, score: res.score, user: res.user, user_score: res.user_score};
        console.log("Gledai dolu:");
        console.log(JSON.stringify(tweetsWithLinksMap[res.id]));
      }

      function saveStoriesWithLinks(e) {
        var res = JSON.parse(e.target.response); 
        //console.log("Received response from dani banani: " + res);
        storiesWithLinksMap[res.id] = {id: res.id, link: res.link, score: res.score}
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
              //console.log(JSON.stringify(tweetsWithLinksMap[property]));
              tweets[i].setAttribute('data-user-score', tweetsWithLinksMap[property].user_score);
            }
          }
        }
        
        updateUIFakeNews(0.65);
      }

      function updateFakeNewsFB() {
        //console.log("Updating fake news...");
        var stories = document.querySelectorAll('.fbUserStory');
        //console.log("Tweets i can see on the timeline: " + tweets.length);
        for (var i = 0; i < stories.length; i++) {
          //console.log("tweetsWithLinksMap: " + JSON.stringify(tweetsWithLinksMap))
          for (var property in storiesWithLinksMap) {
            //console.log("Property: ", property);
            if (storiesWithLinksMap.hasOwnProperty(property)) {
              //console.log("Inside the map...");
              if (!storiesWithLinksMap[property].score) continue;
              if (stories[i].getAttribute('fake-id') !== property.toString()) continue;
              if (stories[i].getAttribute('data-link-score')) continue;
              //console.log("----SETTING ATTRIBUTE for id: " + property)
              stories[i].setAttribute('data-link-score', storiesWithLinksMap[property].score);
            }
          }
        }
        
        updateUIFakeNewsFB(0.65);
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

      function updateUIFakeNewsFB(threshold) {
        threshold = threshold || 0.6;
        var stories = document.querySelectorAll('.fbUserStory');
        for (var i = 0; i < stories.length; i++) {
          toggleStoryUIFakeNewsFB(stories[i], threshold);
        }
      }

      function toggleStoryUIFakeNewsFB(tweet, threshold) {
        var score = tweet.getAttribute('data-link-score');
        //console.log("Score in ui: " + score)
        var screen_name = tweet.getAttribute('data-screen-name');
        //if (true) {
        if (score > threshold && !tweet.getAttribute('user-revealed')) {
          //console.log("Inside the changing of the css.")
         // if (true) tweet.className += ' probably-a-bot';
          //if (true) tweet.parentNode.insertBefore(createMask({ score: score, screen_name: screen_name }, tweet.scrollHeight), tweet);
          if (!tweet.classList.contains('probably-a-bot')) tweet.className += ' probably-a-bot';
          if (!tweet.parentNode.querySelector('.probably-a-bot-mask')) tweet.parentNode.insertBefore(createFakeNewsMaskFB({ score: score, screen_name: screen_name }, tweet.scrollHeight), tweet);
        } else {
          tweet.classList.remove('probably-a-bot');
          if (tweet.parentNode.querySelector('.probably-a-bot-mask')) tweet.parentNode.querySelector('.probably-a-bot-mask').remove();
        }
      }

      /**
       * Toggle Fake News UI for tweet.
       */
      function toggleTweetUIFakeNews(tweet, threshold) {
        addBotScore(tweet.getAttribute('data-user-score'), tweet);

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

      function addBotScore(user_score, tweet) {
        if (user_score == null || tweet.getAttribute('user-score-set')) return;
        var div = document.createElement("div");
        div.className = "feedback";
        div.innerHTML = '<p>Bot Score for this user: ' + user_score*100 + '%</p>';
        tweet.insertBefore(div, tweet.firstChild);
        tweet.setAttribute('user-score-set', 'true');
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
        var div = document.createElement("div");
        div.className = "feedback"
        div.innerHTML = '<a href="#/" onclick="return false;">If you think the story below is actually real news click here and we will improve our algorithm. </a>'
        div.childNodes[0].addEventListener('click', function(e) {
          div.innerHTML = "Thank you for your feedback!";
          div.className = "successful-feedback";
        })
        message.childNodes[1].childNodes[0].addEventListener('click', function(e) {
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].classList.remove('probably-a-bot');
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].setAttribute('user-revealed', true);
          
          //console.log(this.parentNode.parentNode.parentNode.parentNode.childNodes[2]);
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].insertBefore(div, this.parentNode.parentNode.parentNode.parentNode.childNodes[2].firstChild);

          this.parentNode.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode.parentNode);
        });
        return mask;
      }

      function createFakeNewsMaskFB(user, height) {
        var mask = document.createElement('div');
        var message = document.createElement('div');
        mask.className = 'probably-a-bot-mask';
        message.className = 'probably-a-bot-mask-message-short';
        if (height > 150) message.className = 'probably-a-bot-mask-message-medium';
        if (height > 300) message.className = 'probably-a-bot-mask-message-tall';
        message.innerHTML = 'We are ' + Math.round(100 * user.score) + '% confident that this story contains fake news.';
        message.innerHTML += '<p style="font-size: 0.8rem"><a href="#/" class="reveal-tweet" onclick="return false;">Reveal story</a>. <a href="https://botometer.iuni.iu.edu/#!/?sn=' + user.screen_name + '" target="_blank">Learn more about this account</a>.</p>';
        mask.appendChild(message);
        var div = document.createElement("div");
        div.className = "feedback"
        div.innerHTML = '<a href="#/" onclick="return false;">If you think the story below is actually real news click here and we will improve our algorithm. </a>'
        div.childNodes[0].addEventListener('click', function(e) {
          div.innerHTML = "Thank you for your feedback!";
          div.className = "successful-feedback";
        })
        message.childNodes[1].childNodes[0].addEventListener('click', function(e) {
          //console.log(this.parentNode.parentNode.parentNode.parentNode.childNodes[2].classList)
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].classList.remove('probably-a-bot');
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].setAttribute('user-revealed', true);
          
          // //console.log(this.parentNode.parentNode.parentNode.parentNode.childNodes[2]);
          this.parentNode.parentNode.parentNode.parentNode.childNodes[2].insertBefore(div, this.parentNode.parentNode.parentNode.parentNode.childNodes[2].firstChild);


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



