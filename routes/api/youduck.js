var express = require('express');
var router = express.Router();
const { isNone } = require('../../lib/common');
const pool = require('../../lib/database');
const { google } = require('googleapis');

const googleConfig = {
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    redirect: process.env.GOOGLE_OAUTH_REDIRECT_URL
};
const scopes = [ 'profile', 'https://www.googleapis.com/auth/youtube.readonly' ];
const oauth2Client = new google.auth.OAuth2(
    googleConfig.clientId,
    googleConfig.clientSecret,
    googleConfig.redirect
);
const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
});


async function googleLogin(code) {
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    return oauth2Client;
}


// 유덕 로그인
router.get('/login', (req, res) => {
    try {
        res.redirect(url);

    } catch (error) {
        res.json({ status: 'ERR_INTERNAL_SERVER' });
    }
});


// 로그인 OAuth2 Callback
router.get('/login/callback', async (req, res) => {
    try {
        let oauth2Client = await googleLogin(req.query.code);
        
        let oauth2 = google.oauth2({
            auth: oauth2Client,
            version: 'v2'
        });
        oauth2.userinfo.get(async (error, profile) => {
            if (error) {
                console.log('error from oauth2.userinfo.get');
                res.send('<script>alert("로그인에 실패하였습니다.");location.href="/youduck/login";</script>');
                return;
            }

            let yuId = profile.data.id;
            let yuName = profile.data.name;

            let query = "SELECT * FROM t_youduck_users WHERE yu_id = ?";
            let params = [yuId];
            let [result, fields] = await pool.query(query, params);

            if (result.length == 0) {
                // 신규가입
                query = "INSERT INTO t_youduck_users (yu_id, yu_name) VALUES (?, ?)";
                params = [yuId, yuName];
                await pool.query(query, params);

            } else {
                // 기존회원
                let yu_user = result[0];
                if (yu_user.yu_name != yuName) {
                    query = "UPDATE t_youduck_users SET yu_name = ? WHERE yu_id = ?";
                    params = [yuName, yuId];
                    await pool.query(query, params);
                }
            }

            let service = google.youtube('v3');

            service.subscriptions.list({
                auth: oauth2Client,
                part: 'id, snippet',
                mine: true,
                maxResults: 50,
                order: 'alphabetical'

            }, async (error, response) => {
                if (error) {
                    console.log('error from service.subscriptions.list');
                    res.send('<script>alert("유튜브 계정 접근 권한에 동의해주세요.");location.href="/youduck/login";</script>');
                    return;
                }

                let data = response.data;
                let nextToken = data.nextPageToken;
                let channelList = [];

                for (let i = 0; i < data.items.length; i++) {
                    let item = data.items[i];
                    channelList.push({
                        id: item.snippet.resourceId.channelId,
                        name: item.snippet.title
                    });
                }

                if (nextToken) {
                    while (true) {
                        let nextResponse = await service.subscriptions.list({
                            auth: oauth2Client,
                            part: 'id, snippet',
                            mine: true,
                            maxResults: 50,
                            pageToken: nextToken,
                            order: 'alphabetical'
                        });

                        let nextData = nextResponse.data;
                        nextToken = nextData.nextPageToken;

                        for (let i = 0; i < nextData.items.length; i++) {
                            let nextItem = nextData.items[i];
                            channelList.push({
                                id: nextItem.snippet.resourceId.channelId,
                                name: nextItem.snippet.title
                            });
                        }

                        if (nextToken) continue;
                        else break;
                    }
                }

                // 구독정보 삭제
                query = "DELETE FROM t_youduck_subscriptions WHERE ys_yu_id = ?";
                params = [yuId];
                await pool.query(query, params);

                if (channelList.length > 0) { // 구독한 채널 있을때
                    // 채널, 구독정보 추가
                    let ycQuery = "INSERT IGNORE INTO t_youduck_channels (yc_id, yc_name) VALUES";
                    let ycParams = [];
                    let ysQuery = "INSERT INTO t_youduck_subscriptions (ys_yu_id, ys_yc_id) VALUES";
                    let ysParams = [];
                    for (let i = 0; i < channelList.length; i++) {
                        let channel = channelList[i];

                        if (i > 0) {
                            ycQuery += ",";
                            ysQuery += ",";
                        }

                        ycQuery += " (?, ?)";
                        ycParams.push(channel.id, channel.name);

                        ysQuery += " (?, ?)";
                        ysParams.push(yuId, channel.id);
                    }
                    console.log("ycQuery : ", ycQuery);
                    console.log("ysQuery : ", ysQuery);
                    await pool.query(ycQuery, ycParams);
                    await pool.query(ysQuery, ysParams);
                }
                
                req.session.isYuLogined = true;
                req.session.yuId = yuId;
                req.session.save(function() {
                    res.redirect('/youduck');
                });
            });
        });

    } catch (error) {
        res.json({ status: 'ERR_INTERNAL_SERVER' });
    }
});


// 유덕 로그아웃
router.post('/logout', (req, res) => {
    try {
        req.session.isYuLogined = false;
        req.session.yuId = null;
        req.session.save(function() {
            res.json({ status: 'OK' });
        });

    } catch (error) {
        res.json({ status: 'ERR_INTERNAL_SERVER' });
    }
});


// 구독랭킹
router.get('/get/rank', async (req, res) => {
    try {
        if (!req.session.isYuLogined) {
            res.redirect('/youduck/login');
            return;
        }
    
        let yuId = req.session.yuId;

        let query = "SELECT * FROM t_youduck_users WHERE yu_id = ?";
        let params = [yuId];
        let [result, fields] = await pool.query(query, params);
    
        if (result.length == 0) {
            res.json({ status: 'ERR_NO_USER' });
            return;
        }

        let yuName = result[0].yu_name;

        // 상위 5명
        let top5List = [];
        query = "SELECT ysTab.ys_yu_id,";
        query += " CONCAT(SUBSTRING(yuTab.yu_name, 1, 1),";
        query += " LPAD('*', CHAR_LENGTH(yuTab.yu_name) - 1, '*')) AS yuName,";
        query += " COUNT(*) AS ysCnt";
        query += " FROM t_youduck_subscriptions AS ysTab";
        query += " JOIN t_youduck_users AS yuTab ON yuTab.yu_id = ysTab.ys_yu_id";
        query += " GROUP BY ysTab.ys_yu_id HAVING ysCnt > 1 ORDER BY ysCnt DESC LIMIT 0, 5";
        [result, fields] = await pool.query(query);
        for (let i = 0; i < result.length; i++) {
            top5List.push({ yuName: result[i].yuName, ysCnt: result[i].ysCnt });
        }

        // 내 랭킹
        query = "SELECT COUNT(*) + 1 AS myRank FROM";
        query += " (SELECT ys_yu_id, COUNT(*) AS cnt FROM t_youduck_subscriptions GROUP BY ys_yu_id HAVING cnt > 1) AS ysRank";
        query += " WHERE ysRank.cnt > (SELECT COUNT(*) AS cnt FROM t_youduck_subscriptions WHERE ys_yu_id = ?)";
        params = [yuId];
        [result, fields] = await pool.query(query, params);
        let myRank = result[0].myRank;

        // 총 사용자 수
        query = "SELECT * FROM t_youduck_users";
        [result, fields] = await pool.query(query);
        let totalUserCnt = result.length;

        // 내 구독 수
        query = "SELECT * FROM t_youduck_subscriptions WHERE ys_yu_id = ?";
        [result, fields] = await pool.query(query, params);
        let mySubscriptionCnt = result.length;

        res.json({ status: 'OK', result: {
            yuName: yuName,
            top5List: top5List,
            myRank: myRank,
            totalUserCnt: totalUserCnt,
            mySubscriptionCnt: mySubscriptionCnt
        }});

    } catch (error) {
        res.json({ status: 'ERR_INTERNAL_SERVER' });
    }
});


// 구독플갱어
router.get('/get/doppel', async (req, res) => {
    try {
        if (!req.session.isYuLogined) {
            res.redirect('/youduck/login');
            return;
        }
    
        let yuId = req.session.yuId;

        // 내 구독정보
        let query = "SELECT * FROM t_youduck_subscriptions WHERE ys_yu_id = ?";
        let params = [yuId];
        let [result, fields] = await pool.query(query, params);
        if (result.length == 0) {
            res.json({ status: 'ERR_NO_SUBSCRIPTIONS' });
            return;
        }

        let mySubscriptionList = result;
        let mySubscriptionCnt = result.length;

        // 내 구독정보와 일치하는 subscriptions 테이블의 모든 구독정보 가져오기
        let subQuery = "SELECT * FROM t_youduck_subscriptions WHERE ys_yc_id IN (";
        for (let i = 0; i < mySubscriptionList.length; i++) {
            if (i > 0) subQuery += " ,";
            subQuery += ` '${mySubscriptionList[i].ys_yc_id}'`;
        }
        subQuery += " ) AND NOT ys_yu_id = ?";

        // 내 구독정보와 가장 많이 일치하는 사람, 구독정보 가져오기
        query = "SELECT yuTab.yu_name, yuTab.yu_id, COUNT(*) cnt";
        query += ` FROM (${subQuery}) AS ysTab`;
        query += " JOIN t_youduck_users AS yuTab ON yuTab.yu_id = ysTab.ys_yu_id";
        query += " GROUP BY ysTab.ys_yu_id HAVING cnt > 0";
        query += " ORDER BY cnt DESC";
        [result, fields] = await pool.query(query, params);

        if (result.length == 0) {
            res.json({ status: 'ERR_NO_DOPPEL' });
            return;
        }

        let doppelYuId = result[0].yu_id;
        let doppelYuName = result[0].yu_name;
        let doppelName = doppelYuName[0];
        let doppelPer = parseFloat((result[0].cnt / mySubscriptionCnt) * 100);

        // 나랑 일치하는 채널 가져오기
        query = "SELECT * FROM t_youduck_subscriptions AS ysTab";
        query += " JOIN t_youduck_channels AS ycTab ON ycTab.yc_id = ysTab.ys_yc_id";
        query += " WHERE ysTab.ys_yc_id IN (";
        for (let i = 0; i < mySubscriptionList.length; i++) {
            if (i > 0) query += " ,";
            query += ` '${mySubscriptionList[i].ys_yc_id}'`;
        }
        query += " ) AND ysTab.ys_yu_id = ?";
        params = [doppelYuId];
        [result, fields] = await pool.query(query, params);
        let corrList = result;

        // 나랑 일치하지 않는 채널 가져오기
        query = "SELECT * FROM t_youduck_subscriptions AS ysTab";
        query += " JOIN t_youduck_channels AS ycTab ON ycTab.yc_id = ysTab.ys_yc_id";
        query += " WHERE ysTab.ys_yc_id NOT IN (";
        for (let i = 0; i < mySubscriptionList.length; i++) {
            if (i > 0) query += " ,";
            query += ` '${mySubscriptionList[i].ys_yc_id}'`;
        }
        query += " ) AND ysTab.ys_yu_id = ?";
        [result, fields] = await pool.query(query, params);
        let diffList = result;

        if (isNone(doppelYuName)) {
            doppelName = 'unknown';
        } else {
            for (let i = 1; i < doppelYuName.length; i++) {
                doppelName += '*';
            }
        }

        res.json({ status: 'OK', result: {
            doppelName: doppelName,
            doppelPer: doppelPer,
            corrList: corrList,
            diffList: diffList
        }});

    } catch (error) {
        console.log(error);
        res.json({ status: 'ERR_INTERNAL_SERVER' });
    }
});


module.exports = router;