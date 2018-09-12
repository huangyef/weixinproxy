const env = require('./env.js');
//env.js不在版本控制中，需要单独复制
//anyproxy -i --rule ./proxy.js
module.exports = {
  summary: '微信公众号抓取专用代理',
  *beforeSendResponse(requestDetail, responseDetail) {
    let req = requestDetail,
      response = responseDetail.response,
      bodyStr = response.body.toString()
    if (/mp\/profile_ext\?action=home/i.test(req.url)) {//当链接地址为公众号历史消息页面时(第二种页面形式)
      try {
        var reg = /var msgList = \'(.*?)\';/;//定义历史消息正则匹配规则（和第一种页面形式的正则不同）
        var ret = reg.exec(bodyStr);//转换变量为string
        var str = ret ? ret[1] : 'empty'

        var reg2 = /window\.appmsg_token = \"(.*?)\";/;//定义历史消息正则匹配规则（和第一种页面形式的正则不同）
        var ret2 = reg2.exec(bodyStr);//转换变量为string

        var url = ret2 ? req.url + '&appmsg_token=' + ret2[1] : req.url

        if (req.url.indexOf('next=news')>-1) {
          return GetNextNews(str, url, response)
        } else if (req.url.indexOf('next=dynamicSource')>-1){
          return GetNextDynamicSource(str, url, response)
        }
        // return TestGetNext(req.url, response)

      } catch (e) {
      }
    } else if (/mp\/profile_ext\?action=getmsg/i.test(req.url)) {//第二种页面表现形式的向下翻页后的json
      try {
        var json = JSON.parse(bodyStr);
        if (json.general_msg_list != []) {

          if (req.url.indexOf('next=news')>-1) {
            return GetNextNews(json.general_msg_list, req.url, response)
          } else if (req.url.indexOf('next=dynamicSource')>-1){
            return GetNextDynamicSource(json.general_msg_list, req.url, response)
          }
        }
      } catch (e) {
      }
    } else if (/beginNews/i.test(req.url)) {
      try {
        var url = req.url + '?next=news'
        return GetNextNews('', url, response)
      } catch (e) {
      }
    } else if (/beginDynamicSource/i.test(req.url)) {
      try {
        var url = req.url + '?next=dynamicSource'
        return GetNextDynamicSource('', url, response)
      } catch (e) {
      }
    }
    return {
      response: response
    };
  }
};


function GetNextNews(str, url, response) {
  return HttpPost(str, url, '/test/spider').then(function (content) {
    response.body = content
    response.header['Content-Type'] = 'text/html; charset=UTF-8'
    response.statusCode = 200
    return {
      response: response
    }
  })
}
function GetNextDynamicSource(str, url, response) {
  return HttpPost(str, url, '/test/dynamic-spider').then(function (content) {
    response.body = content
    response.header['Content-Type'] = 'text/html; charset=UTF-8'
    response.statusCode = 200
    return {
      response: response
    }
  })
}

function HttpPost(str, url, path) {//将json发送到服务器，str为json内容，url为历史消息页面地址，path是接收程序的路径和文件名
  return new Promise(function (resolve, rej) {
    var http = require('http');
    var data = {
      str: str,
      url: url
    };
    content = JSON.stringify(data);
    var options = {
      method: "POST",
      host: env.host,
      port: 80,
      path: path,//接收程序的路径和文件名
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        "Content-Length": Buffer.byteLength(content)
      }
    };
    var req = http.request(options, function (res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        resolve(chunk + '')
      });
    });
    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });
    req.write(content);
    req.end();
  })
}