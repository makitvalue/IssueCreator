const menu = inputHiddenMenu.value;
const buttonLogin = document.querySelector('.js-button-login');
const pLogout = document.querySelector('.js-p-logout');
const buttonRank = document.querySelector('.js-button-rank');
const buttonDoppel = document.querySelector('.js-button-doppel');
const buttonBack = document.querySelector('.js-button-back');
const ulRankList = document.querySelector('.js-ul-rank-list');
const spanMyRank = document.querySelector('.js-span-my-rank');
const spanMyName = document.querySelector('.js-span-my-name');
const spanMySubscriptionCnt = document.querySelector('.js-span-my-subscription-cnt');
const pRankResult = document.querySelector('.js-p-rank-result');
const divDoppelTabWrapper = document.querySelector('.js-div-doppel-tab-wrapper');
const divDoppelChannelListWrapper = document.querySelector('.js-div-doppel-channel-list-wrapper');


function getYouduckRank() {
    fetch('/api/youduck/get/rank')
    .then((data) => { return data.json(); })
    .then((response) => {
        if (response.status != 'OK') {
            alert('에러가 발생했습니다.');
            return;
        }
        
        let myRank = response.result.myRank;
        let mySubscriptionCnt = response.result.mySubscriptionCnt;
        let top5List = response.result.top5List;
        let totalUserCnt = response.result.totalUserCnt;
        let yuName = response.result.yuName;

        let html = '';
        for (let i = 0; i < top5List.length; i++) {
            let top5 = top5List[i];
            let yuName = top5.yuName;

            if (!yuName) yuName = "unknown";
            html += `<li><span class="no">${(i + 1)}</span><span class="name">${yuName}</span><span class="count">${top5.ysCnt}</span></li>`;
        }

        ulRankList.innerHTML = html;

        pRankResult.innerHTML = `<span>${yuName}</span>님은 전체 <span>${totalUserCnt}</span>명 중 현재 <span>${myRank}</span>위 입니다.`;
        spanMyRank.innerHTML = `${myRank}위`;
        spanMyName.innerHTML = yuName;
        spanMySubscriptionCnt.innerHTML = mySubscriptionCnt;
    });
}


function getYouduckDoppel() {
    fetch('/api/youduck/get/doppel')
    .then((data) => { return data.json(); })
    .then((response) => {
        if (response.status != 'OK') {
            if (response.status == "ERR_NO_SUBSCRIPTIONS") {
                alert("구독한 채널이 없습니다.");
            } else {
                alert('에러가 발생했습니다.');
            }
            return;
        }  


        let doppelName = response.result.doppelName;
        let doppelPer = response.result.doppelPer;
        let corrList = response.result.corrList;
        let diffList = response.result.diffList;

        doppelPer = doppelPer.toFixed(1);

        let html = '';
        for (let i = 0; i < corrList.length; i++) {
            html += `<a href="https://youtube.com/channel/${corrList[i].ys_yc_id}" target="_blank"><div class="doppel-channel">${corrList[i].yc_name}</div></a>`;
        }
        divDoppelChannelListWrapper.querySelector('.js-div-doppel-channel-list[action="CORR"]').innerHTML = html;

        html = '';
        for (let i = 0; i < diffList.length; i++) {
            html += `<a href="https://youtube.com/channel/${diffList[i].ys_yc_id}" target="_blank"><div class="doppel-channel">${diffList[i].yc_name}</div></a>`;
        }
        divDoppelChannelListWrapper.querySelector('.js-div-doppel-channel-list[action="DIFF"]').innerHTML = html;

        pRankResult.innerHTML = `<span>${doppelName}</span>님과 <span>${doppelPer}%</span> 일치합니다.`;
    });
}


function initYouduck() {
    if (menu == 'youduck_rank') {
        getYouduckRank();
    } else if (menu == 'youduck_doppel') {
        getYouduckDoppel();
    }

    if (buttonLogin) {
        buttonLogin.addEventListener('click', () => {
            location.href = '/api/youduck/login';
        });
    }

    if (pLogout) {
        pLogout.addEventListener('click', () => {
            fetch('/api/youduck/logout', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            })
            .then((data) => { return data.json(); })
            .then((response) => {
                if (response.status != 'OK') {
                    alert('에러가 발생했습니다.');
                    return;
                }
                
                location.href = '/youduck/login';
            });
        });
    }

    if (buttonRank) {
        buttonRank.addEventListener('click', () => {
            location.href = '/youduck/rank';
        });
    }

    if (buttonDoppel) {
        buttonDoppel.addEventListener('click', () => {
            location.href = '/youduck/doppel';
        });
    }

    if (buttonBack) {
        buttonBack.addEventListener('click', () => {
            location.href = '/youduck';
        });
    }

    if (divDoppelTabWrapper) {
        divDoppelTabWrapper.querySelectorAll('.js-div-doppel-tab').forEach((divDoppelTab) => {
            divDoppelTab.addEventListener('click', function() {
                let action = this.getAttribute('action');

                if (divDoppelTabWrapper.querySelector('.js-div-doppel-tab.selected').getAttribute('action') == action) return;
                divDoppelTabWrapper.querySelector('.js-div-doppel-tab.selected').classList.remove('selected');

                this.classList.add('selected');

                divDoppelChannelListWrapper.querySelectorAll('.js-div-doppel-channel-list').forEach((divDoppelChannelList) => {
                    divDoppelChannelList.style.display = 'none';
                });
                divDoppelChannelListWrapper.querySelector(`.js-div-doppel-channel-list[action="${action}"]`).style.display = 'block';
            });
        });
    }
}
initYouduck();
