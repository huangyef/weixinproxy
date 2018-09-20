const env = require('./env.js');
//env.js不在版本控制中，需要单独复制
//anyproxy -i --rule ./proxy.js
module.exports = {
  summary: '微信公众号抓取专用代理',
  *beforeSendResponse(requestDetail, responseDetail) {
    let req = requestDetail,
      response = responseDetail.response,
      bodyStr = response.body.toString()
    if (/mp\/profile_ext\?action=home/i.test(req.url)) {//当链接地址为公众号历史消息页面时(第一种页面形式)
      try {
        if (GetCookie(req.requestOptions.headers, 'next') == 'news') {
          return GetNextNews(bodyStr, req.url, response)
        } else if (GetCookie(req.requestOptions.headers, 'next') == 'dynamicSource') {
          return GetNextDynamicSource(bodyStr, req.url, response)
        } else {
          response.body = '未读取到cookie' + req.requestOptions.headers.Cookie
        }
      } catch (e) {
        response.body = e.stack
      }

    } else if (/mp\/profile_ext\?action=getmsg/i.test(req.url)) {//第二种页面表现形式的向下翻页后的json
      try {
        if (GetCookie(req.requestOptions.headers, 'next') == 'news') {
          return GetNextNews(bodyStr, req.url, response)
        } else if (GetCookie(req.requestOptions.headers, 'next') == 'dynamicSource') {
          return GetNextDynamicSource(bodyStr, req.url, response)
        } else {
          response.body = '未读取到cookie'
        }
      } catch (e) {
        response.body = e.stack
      }
    } else if (/beginNews/i.test(req.url)) {
      try {
        let url = req.url
        SetCookie(response.header, 'next', 'news')
        return GetNextNews('', url, response)
      } catch (e) {
        response.body = e.stack
      }
    } else if (/beginDynamicSource/i.test(req.url)) {
      try {
        let url = req.url
        SetCookie(response.header, 'next', 'dynamicSource')
        return GetNextDynamicSource('', url, response)
      } catch (e) {
        response.body = e.stack
      }
    }
    return {
      response: response
    };
  }
};

function SetCookie(header, key, value) {
  let str = [`${key}=${value};`];
  if (header['Set-Cookie']) {
    header['Set-Cookie'] = header['Set-Cookie'].concat(str)
  } else {
    header['Set-Cookie'] = str
  }
}
function GetCookie(header, key) {
  let c_start,c_end
  if (header.Cookie.length > 0) {
    c_start = header.Cookie.indexOf(key + "=")
    if (c_start != -1) {
      c_start = c_start + key.length + 1
      c_end = header.Cookie.indexOf(";", c_start)
      if (c_end == -1) c_end = header.Cookie.length
      return unescape(header.Cookie.substring(c_start, c_end))
    }
  }
  return ""
}


function GetNextNews(str, url, response) {
  return HttpPost(str, url, '/spiders/wechatspider').then(function (data) {
    response.body = data.body
    if (response.header['Set-Cookie']) {
      response.header['Set-Cookie'] = response.header['Set-Cookie'].concat(data.setCookie)
    } else {
      response.header['Set-Cookie'] = data.setCookie
    }
    response.header['Content-Type'] = 'text/html; charset=UTF-8'
    response.statusCode = 200
    return {
      response: response
    }
  })
}
function GetNextDynamicSource(str, url, response) {
  return HttpPost(str, url, '/test/dynamic-spider').then(function (data) {
    response.body = data.body
    if (response.header['Set-Cookie']) {
      response.header['Set-Cookie'] = response.header['Set-Cookie'].concat(data.setCookie)
    } else {
      response.header['Set-Cookie'] = data.setCookie
    }
    response.header['Content-Type'] = 'text/html; charset=UTF-8'
    response.statusCode = 200
    return {
      response: response
    }
  })
}

function HttpPost(str, url, path) {//将json发送到服务器，str为json内容，url为历史消息页面地址，path是接收程序的路径和文件名
  return new Promise(function (resolve, rej) {
    let http = require('http');
    let data = {
      str: str,
      url: url
    };
    content = JSON.stringify(data);
    let options = {
      method: "POST",
      host: env.host,
      port: 8088,
      path: path,//接收程序的路径和文件名
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        "Content-Length": Buffer.byteLength(content)
      }
    };
    let req = http.request(options, function (res) {
      res.setEncoding('utf8');
      res.on('data', function (chunk) {
        let setCookie = res.headers['set-cookie']
        setCookie = setCookie ? setCookie : []
        for (const i in setCookie) {
          if (!setCookie[i].endsWith(';')) {
            setCookie[i] += ';'
          }
        }
        resolve({ body: chunk + '', setCookie: setCookie })
      });
    });
    req.on('error', function (e) {
      console.log('problem with request: ' + e.message);
    });
    req.write(content);
    req.end();
  })
}