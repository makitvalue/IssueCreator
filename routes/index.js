var express = require('express');
var router = express.Router();


router.get('/', (req, res) => {
	res.render('index', {
        menu: 'main',
        title: '이슈크리에이터 - IssueCreator'
    });
});


router.get('/terms/privacy', (req, res) => {
    res.render('index', {
        menu: 'terms_privacy',
        title: '개인정보 처리방침 | 이슈크리에이터 - IssueCreator'
    });
});


router.get('/terms/agreement', (req, res) => {
    res.render('index', {
        menu: 'terms_agreement',
        title: '서비스 이용약관 | 이슈크리에이터 - IssueCreator'
    });
});


router.get('/about', (req, res) => {
    res.render('index', {
        menu: 'about',
        title: 'ABOUT | 이슈크리에이터 - IssueCreator'
    });
});


// Youduck
router.get('/youduck', (req, res) => {
    // if (!req.session.isYuLogined) {
    //     res.redirect('/youduck/login');
    //     return;
    // }

    res.render('index', {
        menu: 'youduck',
        title: '유덕(YouDuck) | 이슈크리에이터 - IssueCreator',

		isYuLogined: req.session.isYuLogined
    });
});

router.get('/youduck/login', (req, res) => {
    res.render('index', {
        menu: 'youduck_login',
        title: '로그인 | 유덕(YouDuck) | 이슈크리에이터 - IssueCreator'
    });
});

router.get('/youduck/rank', (req, res) => {
    if (!req.session.isYuLogined) {
        res.redirect('/youduck/login');
        return;
    }

    res.render('index', {
        menu: 'youduck_rank',
        title: '구독랭킹 | 유덕(YouDuck) | 이슈크리에이터 - IssueCreator'
    });
});

router.get('/youduck/doppel', (req, res) => {
    if (!req.session.isYuLogined) {
        res.redirect('/youduck/login');
        return;
    }

    res.render('index', {
        menu: 'youduck_doppel',
        title: '구독플갱어 | 유덕(YouDuck) | 이슈크리에이터 - IssueCreator'
    });
});


router.get('/bridge', (req, res) => {
	console.log('hi');
	res.render('index', {
        menu: 'bridge',
        title: '이슈크리에이터 - IssueCreator'
    });
});


module.exports = router;
