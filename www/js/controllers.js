angular.module('starter.controllers', [])

.controller('mapCtrl', function($scope,$rootScope,$ionicPopup,$http,$state) {
  var map, geolocation;
  //加载地图，调用浏览器定位服务
  map = new AMap.Map('container', {
    resizeEnable: true
  });
  map.plugin('AMap.Geolocation', function() {
    geolocation = new AMap.Geolocation({
      enableHighAccuracy: true,//是否使用高精度定位，默认:true
      timeout: 10000,          //超过10秒后停止定位，默认：无穷大
      buttonOffset: new AMap.Pixel(10, 20),//定位按钮与设置的停靠位置的偏移量，默认：Pixel(10, 20)
      zoomToAccuracy: true,      //定位成功后调整地图视野范围使定位位置及精度范围视野内可见，默认：false
      buttonPosition:'RB'
    });
    map.addControl(geolocation);
    geolocation.getCurrentPosition(function(status,result){
      $rootScope.lng  = result.position.lng;
      $rootScope.lat  = result.position.lat;
    });
    geolocation.watchPosition();
    AMap.event.addListener(geolocation, 'complete', onComplete);//返回定位信息
    AMap.event.addListener(geolocation, 'error', onError);      //返回定位出错信息
  });
  //解析定位结果
  function onComplete(data) {
    $rootScope.lng = data.position.getLng();
    $rootScope.lat = data.position.getLat();
  }
  //解析定位错误信息
  function onError(data) {
    // 一个提示对话框
    $ionicPopup.alert({
      title: "定位",
      template: '很抱歉定位失败，请打开Wi-Fi和GPS再次重新进入'
    });
    // alert("很抱歉定位失败，请打开Wi-Fi和GPS再次重新进入");
  }

  $http.get('http://123.206.9.36/StopPark/index.php/admin/Park/api')
      .then(function (resp) {
        var items = resp.data;
        angular.forEach(items, function (data) {
          var lng = data.postion_X;
          var lat = data.postion_Y;
          var marker = new AMap.Marker({
            // icon: icon,//24px*24px
            position: [lng, lat],
            offset: new AMap.Pixel(-12, -12),
            map: map
          });
        });
        if(window.localStorage.username){
          $http.get('http://123.206.9.36/StopPark/index.php/Car/TestPark', {
            params: {
              phone: window.localStorage.username
            }
          }).then(function (resp) {
            var s = resp.data.status;
            if(s===1){
              $rootScope.isIn = true;
              $rootScope.isPay = false;
              $rootScope.time = resp.data.time;
              $rootScope.charge = resp.data.price;
              var alertPopup = $ionicPopup.alert({
                title: "当前位置",
                template: '您有支付未完成，请支付！'
              });
              alertPopup.then(function (resp) {
                $state.go('goPay');
              })
            }
          })
        }
      })
})
.controller('slideCtrl', function($state) {
  //第一次进入会有轮播图
  if(window.localStorage.inAccunt){
    $state.go('tab.map');
  }
  window.localStorage.inAccunt = 1;
})

.controller('carListCtrl',['$scope','$http','$state',function($scope,$http,$state){
  //初值为在map界面获取
  $scope.p = [$scope.lng,$scope.lat];
  $scope.$watch('p',function (newValue,oldValue) {
    $http.get('http://123.206.9.36/StopPark/index.php/admin/Park/api')
      .then(function(resp){
        var items1 = resp.data;
        //遍历数组，添加dis属性
        angular.forEach(items1,function(data){
          var lnglat = new AMap.LngLat(data.postion_X,data.postion_Y);
          var dis1 = lnglat.distance([$scope.lng,$scope.lat]);
          if(dis1){data.dis = dis1.toFixed(0);}
        });
        $scope.items = items1;
      });
  },true);
  $scope.checkLogin = function (item) {
    if(!window.localStorage.username){
      $state.go('login');
    }else {
      $state.go('detail',{
        id:item.id
      })
    }
  }
}])
  .controller('detailCtrl', function($scope,$stateParams,$state,$http,$rootScope,$ionicPopup) {
    //返回键
    $scope.barBack = function(){
      window.history.back();
    };
    $http.get('http://123.206.9.36/StopPark/index.php/admin/Park/api',{
      params:{
        id:$state.params.id
      }
    }).then(function(resp){
      //便利得到的数组，找到id与当前id相同的对象赋给detail
      angular.forEach(resp.data,function(data){
        if(data.id==$state.params.id){
          $scope.carDetail = data;
        }
      });
    });
    //进入停车场
    $scope.inOrLogin = function(){
      $http.get('http://123.206.9.36/StopPark/index.php/admin/Articale/api').then(function(resp){
        angular.forEach(resp.data,function(data){
          //这里的算法有问题，会接收到后台发送的所有数据，较费流量，应该在后台做一个筛选(第二版)
          if(window.localStorage.username==data.name){
            //如果用户未绑定车牌号
            if(!data.carNum){
              // 一个提示对话框
              $ionicPopup.alert({
                title: "停车场详情",
                template: '很抱歉进入失败，请先绑定车牌号'
              });
              // alert("请先绑定车牌号");
              return 0;
            }else {
              window.localStorage.carNum = data.carNum;
              //nowCarLog，nowCarLat分别为当前进入的停车场的经纬度
              $rootScope.nowCarLog = $scope.carDetail.postion_X;
              $rootScope.nowCarLat = $scope.carDetail.postion_Y;
              //创建lnglat对象用来计算距离
              $scope.lnglat = new AMap.LngLat($scope.nowCarLog, $scope.nowCarLat);
              //dis1即为当前地点距停车场距离
              $scope.dis1 = $scope.lnglat.distance([$scope.lng, $scope.lat]);
              //如果算的距离$scope.dis1为undefined；
              if (!$scope.dis1) {
                // 一个提示对话框
                $ionicPopup.alert({
                  title: "停车场详情",
                  template: '未获取到你与停车场的距离，请检查是否开启GPS或是否已授予权限.然后重新点击进入停车场'
                });
                // alert("未获取到你与停车场的距离，请检查是否开启GPS或是否已授予权限.然后重新点击进入停车场");
                return 0;
              }
              //如果距离大于500
              if ($scope.dis1 > 600) {
                // 一个提示对话框
                $ionicPopup.alert({
                  title: "停车场详情",
                  template: '您当前位置与停车场超过500米，请在500内点击进入'
                });
                return 0;
                // alert("您当前位置与停车场超过500米，请在500内点击进入");
              } else {
                //成功进入停车场
                //在根作用域之添加一个进入停车场时间，在支付界面进行调用
                $rootScope.time = new Date().getTime();
                $rootScope.charge = $scope.carDetail.price;
                //禁用进入标签
                $rootScope.isIn = true;
                $http.get('http://123.206.9.36/StopPark/index.php/Car/InPark',{
                  params:{
                    phone:window.localStorage.username,
                    ParkName:$scope.carDetail.name,
                    carNum:window.localStorage.carNum
                  }
                }).then(function (resp) {
                  if(resp.data.status===0){
                    $state.go('successIn');
                  }else if(resp.data.status===1){
                    $ionicPopup.alert({
                      title: "停车场详情",
                      template: '当前停车场不存在'
                    });
                  }
                });
              }
            }
            return 0;
          }
        });
      });
    }
  })
  .controller('successInCtrl',function($interval,$scope){
    //秒数初始为3
    $scope.account = 3;
    //每隔一秒执行
    $scope.a = $interval(back,1000);
    function back(){
      $scope.account--;
      //秒数为零返回
      if ($scope.account==0){
        $interval.cancel($scope.account);
        window.history.back();
      }
    }
  })
  .controller('meCtrl', function($scope,$stateParams,$ionicActionSheet,$cordovaCamera,$cordovaFileTransfer,$state,$ionicPopup,$rootScope) {
    $rootScope.img = window.localStorage.userImg;
    //获取照片
    //定义选择照片的函数，
    $scope.checkLogin = function (i) {
      if(!window.localStorage.username){
        $state.go('login');
      }else {
        $state.go(i);
      }
    };
    $scope.denglu = function () {
      if(window.localStorage.username){
        var alertPopup = $ionicPopup.alert({
          title:"登录",
          template:"抱歉，您已登录，如想切换账号请先退出登录"
        });
        alertPopup.then(function (resp) {
          $state.go('meSetting');
        })
      }else {
        $state.go('login');
      }
    };
    $scope.selectImg = function() {
      if(!window.localStorage.username){
        var alertPopup = $ionicPopup.alert({
          title: "选择照片",
          template: '抱歉，请先登录'
        });
        alertPopup.then(function (resp) {
          $state.go('login');
        })
      }else {
        $scope.hideSheet = $ionicActionSheet.show({
          buttons: [{
            text: '相册'
          }, {
            text: '拍照'
          }
          ],
          titleText: '选择图片',
          cancelText: '取消',
          cancel: function() {
            // add cancel code..
          },
          buttonClicked: function(index) {
            navigator.camera.getPicture(cameraSuccess, cameraError, {
              sourceType: index
            }); //调用系统相册、拍照
          }
        });
      }
    };
    function cameraSuccess(img) {
      $rootScope.img = img;//这里返回的img是选择的图片的地址，可以直接赋给img标签的src，就能显示了
      window.localStorage.userImg = $rootScope.img;
      $scope.hideSheet();
      // window.resolveLocalFileSystemURL(img, function success(fileEntry) {
      //  upload(fileEntry.toInternalURL());//将获取的文件地址转换成file transfer插件需要的绝对地址
      // }, function() {
      //  alert("上传失败");
      // });
    }
    function cameraError(img) {
      //上传失败
    }

    // function upload(fileURL) {//上传图片
    //
    //   var win = function(r) {//成功回调方法
    //     var response = JSON.parse(r.response);//你的上传接口返回的数据
    //     if(response.datas.state){
    //       alert("修改成功");
    //     }else {
    //       alert(response.datas.error);
    //     }
    //   };
    //
    //   var fail = function(error) {//失败回调方法
    //     alert("上传失败");
    //   };
    //
    //   var options = new FileUploadOptions();
    //   options.fileKey = "pic";//这是你的上传接口的文件标识，服务器通过这个标识获取文件
    //   options.fileName = fileURL.substr(fileURL.lastIndexOf('/') + 1);
    //   options.mimeType = "image/gif";//图片
    //
    //   var params = {};
    //   params.username = window.localStorage.username;
    //   options.params = params;
    //
    //   var ft = new FileTransfer();
    //   ft.upload(fileURL, encodeURI(''), win, fail, options);//开始上传，uoloadurl是你的上传接口地址
    // }

  })
  .controller('loginCtrl', function($scope,$stateParams,$http,$rootScope,$state,$ionicPopup) {
    $scope.staLogin = {
      tel:"",
      pwd:""
    };
    $scope.carLog = function(){
      var re = /^[0-9]+.?[0-9]*$/;
      if($scope.staLogin.tel.length!=11||!re.test($scope.staLogin.tel)){
        // 一个提示对话框
        $ionicPopup.alert({
          title: "登录",
          template: '请输入正确的号码格式'
        });
      }else {
        if(!$scope.staLogin.pwd){
          $ionicPopup.alert({
            title: "登录",
            template: "请输入密码"
          });
        }
        $http.get('http://123.206.9.36/StopPark/index.php/Articale/login',{
          params:{
            username:$scope.staLogin.tel,
            password:$scope.staLogin.pwd
          }
        }).then(function(resp){
          if(resp.data.status==1){
            // 一个提示对话框
            $ionicPopup.alert({
              title: "登录",
              template: '抱歉，此用户名不存在'
            });
            return 0;
          }
          else if(resp.data.status==2){
            // 一个提示对话框
            $ionicPopup.alert({
              title: "登录",
              template: '抱歉，用户名或密码错误'
            });
            return 0;
          }
          else if(resp.data.status==3){
            $rootScope.isLogin = true;
            $rootScope.userImg = resp.data.image;
            var storage=window.localStorage;
            storage.username = $scope.staLogin.tel;
            storage.pw = $scope.staLogin.pwd;
            $scope.staLogin.tel = "";
            $scope.staLogin.pwd = "";
            window.history.back();
          }
        });
      }
    }
  })
  .controller('forgetPwCtrl',function($scope,$http,$interval,$ionicPopup){
    $scope.codeAccunt = 60;
    $scope.pwShow = false;
    $scope.isSend = false;
    $scope.barBack = function(){
      window.history.back();
    };
    $scope.getCode = "获取验证码";
    $scope.forPw = {
      tel:"",
      pw:"",
      code:""
    };
    $scope.iKnow = function(){
      $scope.pwShow = false;
    };
    $scope.sendCode = function () {
      var re = /^[0-9]+.?[0-9]*$/;
      if($scope.forPw.tel.length!=11||!re.test($scope.forPw.tel)){
        $ionicPopup.alert({
          title:"忘记密码",
          template: "请输入正确的号码格式"
        });
        return 0;
      }else {
        $http.get('http://123.206.9.36/StopPark/index.php/Articale/message',{
          params:{
            phone: $scope.forPw.tel
          }
        }).then(function (resp) {
          $scope.isSend = true;
          $scope.code2 = resp.data.rand;
          $interval.cancel($scope.sendTime);
          $scope.sendTime = $interval(function () {
            if($scope.codeAccunt>0){
              $scope.codeAccunt--;
              $scope.getCode = $scope.codeAccunt+"秒后再发送";
            }else {
              $scope.codeAccunt = 60;
              $scope.getCode = "获取验证码";
              $scope.isSend = false;
              $interval.cancel($scope.sendTime);
            }
          },1000)
        })
      }
    };
    $scope.confirmFindPwBtn = function(){
      if($scope.forPw.code!=$scope.code2){
        $ionicPopup.alert({
          title:"忘记密码",
          template:"验证码错误，请重新输入验证码"
        })
      }else {
        $http.get('http://123.206.9.36/StopPark/index.php/admin/Articale/api').then(function(resp){
          angular.forEach(resp.data,function(data){
            if($scope.forPw.tel==data.name){
              $scope.forPw.pw = data.password;
              $scope.pwShow = true;
            }
          });
        });
      }
    }
  })
  //注册
  .controller('registerCtrl', function($scope,$stateParams,$http,$state,$ionicPopup,$interval) {
    $scope.codeAccunt = 60;
    $scope.isSend  = false;
    $scope.getCode = "获取验证码";
    $scope.barBack = function(){
      window.history.back();
    };
    $scope.sta = {
      tel:"",
      pwd1:"",
      code: ""
    };
    $scope.sendCode = function () {
      var re = /^[0-9]+.?[0-9]*$/;
      if($scope.sta.tel.length!=11||!re.test($scope.sta.tel)){
        $ionicPopup.alert({
          title:"注册",
          template: "请输入正确的手机号格式"
        });
        return 0;
      }else {
        $http.get('http://123.206.9.36/StopPark/index.php/Articale/message',{
          params:{
            phone: $scope.sta.tel
          }
        }).then(function (resp) {
          $scope.isSend = true;
          $scope.code2 = resp.data.rand;
          $interval.cancel($scope.sendTime);
          $scope.sendTime = $interval(function () {
            if($scope.codeAccunt>0){
              $scope.codeAccunt--;
              $scope.getCode = $scope.codeAccunt + "秒后再发送"
            }else {
              $scope.codeAccunt = 60;
              $scope.getCode = "获取验证码";
              $scope.isSend = false;
              $interval.cancel($scope.sendTime);
            }
          },1000)
        })
      }
    };
    $scope.carSub  = function(){
      //验证是否为数字
      var re = /^[0-9]+.?[0-9]*$/;
      //如果输入的电话长度不为11或不是是数字
      if($scope.sta.tel.length!=11||!re.test($scope.sta.tel)){
        // 一个提示对话框
        $ionicPopup.alert({
          title: "注册",
          template: '抱歉，请输入正确的号码格式'
        });
        return 0 ;
      }
      else {
        //密码小于于六位
        if($scope.sta.pwd1.length<6){
          // 一个提示对话框
          $ionicPopup.alert({
            title: "注册",
            template: '抱歉，密码小于六位，请重新输入'
          });
          return 0 ;
        }
        else {
          //验证码错误
          if($scope.sta.code!=$scope.code2){
            // 一个提示对话框
            $ionicPopup.alert({
              title: "注册",
              template: '抱歉，验证码输入错误，请重新输入'
            });
            // alert("两次密码不一致，请重新输入");
            return 0;
          }
          else {
            $http.post('http://123.206.9.36/StopPark/index.php/Articale/signUp',{
              username:$scope.sta.tel, password:$scope.sta.pwd1
            }).then(function(resp){
              if(resp.data.status==1){
                // 一个提示对话框
                $ionicPopup.alert({
                  title: "注册",
                  template: '抱歉，该用户名已经存在'
                });
                // alert("用户名已存在");
                return 0;
              }
              else if(resp.data.status==2){
                $state.go('login');
              }
            })
          }
        }
      }
    }
  })
  .controller('personalCtrl',function($scope,$http,$stateParams,$state,$ionicPopup){
    $scope.barBack = function(){
      window.history.back();
    };
    //验证邮箱
    $scope.emailVerification = /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/;
    //登陆状态发生改变时：
    $scope.$watch('isLogin',function(newValue,oldValue){
      //未登陆:
      if(!$scope.isLogin){
        $scope.meInformation={
          name : "",
          sex: '',
          email:"",
          carNum:""
        };
      }else {
        $http.get('http://123.206.9.36/StopPark/index.php/admin/Articale/api').then(function(resp){
          angular.forEach(resp.data,function(data){
            //这里的算法有问题，会接收到后台发送的所有数据，较费流量，应该在后台做一个筛选(第二版)
            if(window.localStorage.username==data.name){
              if(data.sex=='男'){
                $scope.meInformation={
                  name : data.phone,
                  sex: 'm',
                  email:data.email,
                  carNum:data.carNum
                };
              }else {
                if(data.sex=='女'){
                  $scope.meInformation={
                    name : data.phone,
                    sex: 'f',
                    email:data.email,
                    carNum:data.carNum
                  };
                }else {
                  $scope.meInformation={
                    name : data.phone,
                    sex: '',
                    email:data.email,
                    carNum:data.carNum
                  };
                }
              }
            }
          });
        });
      }
    });
    //点击确认后:
    $scope.confirmSubPerInformation = function() {
      if (!$scope.emailVerification.test($scope.meInformation.email)) {
        // 一个提示对话框
        $ionicPopup.alert({
          title: "个人详情",
          template: '抱歉，请输入正确的邮箱格式'
        });
        // alert("请输入正确的邮箱格式");
        return 0;
      } else {
        $http.get('http://123.206.9.36/StopPark/index.php/Articale/inform', {
          params: {
            username: window.localStorage.username,
            name: $scope.meInformation.name,
            sex: $scope.meInformation.sex,
            email: $scope.meInformation.email
          }
        }).then(function (resp) {
          if (resp.data.status == 1) {
            // 一个提示对话框
            $ionicPopup.alert({
              title: "个人详情",
              template: '抱歉，该用户名不存在'
            });
            // alert("用户名不存在");
            return 0;
          } else if (resp.data.status == 2) {
            //成功后
            // 一个提示对话框
            $ionicPopup.alert({
              title: "个人详情",
              template: '修改个人信息成功'
            });
            // alert("修改个人信息成功");
            console.log($scope.meInformation);
          }
        })
      }
    }
  })
    //车牌号绑定
  .controller('carNumberBindCtrl',function($scope,$state,$http,$ionicPopup,$interval){
    $scope.codeAccunt = 60;
    $scope.getCode = "发送验证码";
    $scope.carNum = {
      num: window.localStorage.carNum,
      code:""
    };
    //发送验证码：
    $scope.sendCode = function () {
      //车牌号验证
      var re = /^[京津沪渝冀豫云辽黑湘皖鲁新苏浙赣鄂桂甘晋蒙陕吉闽贵粤青藏川宁琼使领A-Z]{1}[A-Z]{1}[A-Z0-9]{4}[A-Z0-9挂学警港澳]{1}$/;
      if($scope.carNum.num.length!=7||!re.test($scope.carNum.num)){
        $ionicPopup.alert({
          title:"车牌号绑定",
          template: "请输入正确的车牌号格式"
        });
        return 0;
      }else {
        $http.get('http://123.206.9.36/StopPark/index.php/Articale/message',{
          params:{
            phone: window.localStorage.username
          }
        }).then(function (resp) {
          $scope.isSend = true;
          $scope.code2 = resp.data.rand;
          $interval.cancel($scope.sendTime);
          $scope.sendTime = $interval(function () {
            if($scope.codeAccunt>0){
              $scope.codeAccunt--;
              $scope.getCode = $scope.codeAccunt + "秒后再发送";
            }else {
              $scope.codeAccunt = 60;
              $scope.getCode = "获取验证码";
              $scope.isSend=false;
              $interval.cancel($scope.sendTime);
            }
          },1000)
        })
      }
    };
    //初始化：显示车牌号
    $scope.bindInit = function () {
      $http.get('http://123.206.9.36/StopPark/index.php/admin/Articale/api').then(function(resp){
        angular.forEach(resp.data,function(data){
          //这里的算法有问题，会接收到后台发送的所有数据，较费流量，应该在后台做一个筛选(第二版)
          if(window.localStorage.username==data.name){
            if(!data.carNum){
              $scope.carNum.num = '';
              return 0;
            }else {
              $scope.carNum.num = data.carNum;
              window.localStorage.carNum = data.carNum;
            }
          }
        });
      });
    };
    //返回
    $scope.barBack = function(){
      window.history.back();
    };
    //确认绑定
    $scope.confirmBindCarNum = function(){
      //验证码是否输入正确
      if($scope.carNum.code!=$scope.code2){
        // 一个提示对话框
        $ionicPopup.alert({
          title: "绑定车牌号",
          template: '验证码错误，请重新输入'
        });
        return 0;
      }else {
        $http.get('http://123.206.9.36/StopPark/index.php/Articale/carNum',{
          params:{
            username:window.localStorage.username,
            carNum:$scope.carNum.num
          }
        }).then(function(resp){
          if(resp.data.status==2){
            // 一个提示对话框
            var alertPopup = $ionicPopup.alert({
              title: "绑定车牌号",
              template: '绑定成功'
            });
            alertPopup.then(function (resp) {
              window.localStorage.carNUm = $scope.carNum.num;
            })
          }
        })
      }
    }
  })
  .controller('pwChangeCtrl',function($scope,$http,$state,$stateParams,$ionicPopup){
    $scope.barBack = function(){
      window.history.back();
    };
    $scope.pw = {
      oldPw : "",
      newPw1 : "",
      newPw2: ""
    };
    //点击确认修改密码
    $scope.confirmPw = function(){
      //如果当前密码不正确
      if($scope.pw.oldPw!=window.localStorage.pw){
        // 一个提示对话框
        $ionicPopup.alert({
          title: "修改密码",
          template: '抱歉，您输入的密码不正确'
        });
        // alert("您输入的当前密码不正确");
        return 0;
      }
      else {
        //如果输入的密码小于六位
        if($scope.pw.newPw1.length<6||$scope.pw.newPw2.length<6){
          // 一个提示对话框
          $ionicPopup.alert({
            title: "修改密码",
            template: '抱歉，您输入的密码小于六位，请重新输入'
          });
          // alert("您输入的密码小于六位，请重新输入");
          $scope.pw.newPw1 = "";
          $scope.pw.newPw2 = "";
          return 0;
        }else {
          //如果两次输入不一致
          if($scope.pw.newPw1!=$scope.pw.newPw2){
            // 一个提示对话框
            $ionicPopup.alert({
              title: "修改密码",
              template: '抱歉，您两次输入的密码不一致'
            });
            // alert("您两次输入的密码不一致");
            return 0;
          }else {
            //发送请求改变密码
            $http.get('http://123.206.9.36/StopPark/index.php/Articale/passWord',{
              params:{
                username:window.localStorage.username,
                password:$scope.pw.oldPw,
                passwordNew:$scope.pw.newPw2
              }
            }).then(function(){
              // 一个提示对话框
              $ionicPopup.alert({
                title: "修改密码",
                template: '修改密码成功'
              });
              // alert("修改密码成功");
              //将缓存中的密码也改掉
              window.localStorage.pw = $scope.pw.newPw2;
              //使是输入框都清空
              $scope.pw = {
                oldPw : "",
                newPw1 : "",
                newPw2: ""
              };
            })
          }
        }
      }
    }
  })
  .controller('goPayCtrl',function($scope,$rootScope,$timeout,$interval,$state,$ionicPopup,$http){
    //返回
    $scope.barBack = function(){
      window.history.back();
    };
    $scope.payMoney = 0;
    $scope.payStatus = '查询';
    $scope.mon = 0;
    $scope.isPay = false;
    $scope.payCarNum={
      num : ""
    };
    //点击查询
    $scope.confirmPayment = function(){
      //未进入停车场
      if(!$scope.isIn){
        // 一个提示对话框
        $ionicPopup.alert({
          title: '支付',
          template: '抱歉，您还未进入停车场'
        });
        // alert("您还未进入停车场");
        return 0;
      }else {
        //未输入车牌号
        if(!$scope.payCarNum.num){
          // 一个提示对话框
          $ionicPopup.alert({
            title: "支付",
            template: '抱歉，请先输入车牌号'
          });
          // alert("请先输入车牌号");
          return 0;
        }else {
          //输入的车牌号与存储的车牌号不等
          if($scope.payCarNum.num!=window.localStorage.carNum){
            // 一个提示对话框
            $ionicPopup.alert({
              title: "支付",
              template: '抱歉，您输入的车牌号有误或您还未进进行绑定车牌号'
            });
            // alert("您输入的车牌号有误或您还未进进行绑定车牌号");
          }else {
            if($scope.payStatus == '查询'){
              if(isNaN($scope.time)){
                $scope.time = Date.parse(new Date($scope.time));
              }
              //检查时间为checktime
              $rootScope.checktime = new Date().getTime();
              //计算间隔时间
              var interval = $scope.checktime-$scope.time;
              var mon1 = $scope.charge*interval/3600000;
              $scope.mon = mon1.toFixed(2);
              //如果t2存在的话也撤销掉，防止冲突
              // $interval.cancel($scope.t2);
              //把按键改为支付
              $scope.payStatus = '支付';
            }else if($scope.payStatus == '支付'){
              window.open('https://auth.alipay.com/login/index.htm','_self','location=yes');
              $scope.payTime = new Date().getTime();
              var payCheckInterval = $scope.payTime-$scope.checktime;
              if(payCheckInterval>60000){
                // 一个提示对话框
                $ionicPopup.alert({
                  title: "支付",
                  template: '抱歉，您支付时间超过一分钟，请重新支付'
                });
                // alert("支付时间超过一分钟，请重新支付");
                $scope.payStatus = '查询';
                return 0;
              }else {
                //每点一次支付都会在支付总数上加
                $scope.payMoney = $scope.payMoney+$scope.mon;
                //不能点击支付了
                $rootScope.canPay = false;
                //把time改为当前时间
                $scope.time = new Date().getTime();
                //显示支付提示信息
                $scope.isPay = true;
                //如果t2存在的话也撤销掉，防止冲突
                $interval.cancel($scope.t2);
                //15分钟后执行goOut函数
                $scope.t2 = $timeout(goOut,900000);
                function goOut(){
                  //创建lnglat对象用来计算距离
                  $scope.lnglat = new AMap.LngLat($scope.nowCarLog,$scope.nowCarLat);
                  //dis1即为当前地点距停车场距离
                  $scope.dis1 = $scope.lnglat.distance([$scope.lng,$scope.lat]);
                  //如果未获取当前定位，则重新获取
                  if(!$scope.dis1){
                    goOut();
                  }
                  //获取到定位后
                  else {
                    //判断距离，如果还未出停车场，则重新计算价钱
                    if($scope.dis<500){
                      //隐藏掉支付内容
                      $scope.isPay = false;
                      //撤销timeout
                      $timeout.cancel($scope.t2);
                      //可以点击支付了
                      $rootScope.canPay = true;
                      $scope.payStatus = '查询';
                    }
                    //如果已经出了停车场
                    else {
                      //可以点击进入停车场
                      $interval.cancel($scope.t2);
                      $rootScope.isIn = false;
                      $scope.isPay = false;
                      $scope.payStatus = '查询';
                      $scope.canPay = true;
                      $scope.mon = 0;
                      //清空时间缓存
                      $rootScope.time = 0;
                      $rootScope.time2 = 0;
                      $rootScope.time3 = 0;
                      $http.get('http://123.206.9.36/StopPark/index.php/Car/OutPark',{
                        params:{
                          phone:window.localStorage.username,
                          carNum:window.localStorage.carNum,
                          price:$scope.payMoney
                        }
                      })
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  })
  .controller('payListCtrl',function ($scope,$http,$stateParams,$ionicPopup) {
    //返回
    $scope.barBack = function(){
      window.history.back();
    };
    $http.get('http://123.206.9.36/StopPark/index.php/Car/getAll',{
      params:{
        phone: window.localStorage.username
      }
    }).then(function (resp) {
      var items = resp.data;
      angular.forEach(items,function (data) {
        if(data.time){
          var arr = new Array;
          arr = data.time.split(":");
          data.timeD = arr[0];
          data.timeH = arr[1];
          data.timeM = arr[2];
          data.timeS = arr[3];
          data.isShow = false;
        }else {
          var alertPopup = $ionicPopup.alert({
            title: "缴费记录",
              template: '抱歉，您还有支付未完成'
          });
          alertPopup.then(function(resp){
          })
        }
      });
      $scope.payLists = items;
    });
    $scope.showDetail = function (item) {
      var isshow = item.isShow;
      item.isShow = !isshow;
    }
  })
  .controller('meSettingCtrl',function($scope,$rootScope,$ionicPopup,$state){
    $scope.barBack = function(){
      window.history.back();
    };
    $scope.exitLog = function(){
      if($scope.isIn){
        // 一个提示对话框
        $ionicPopup.alert({
          title: "设置",
          template: '抱歉，您已进入停车场,在支付完成后才能推出登陆'
        });
        // alert("您已进入停车场,在支付完成后才能推出登陆");
        return 0;
      }else {
        //确认框
        var confirmPopup = $ionicPopup.confirm({
          title: '设置',
          template: '是否退出当前账号?',
          cancelText: '取消', // String (默认: 'Cancel')。一个取消按钮的文字
          okText: '确定' // String (默认: 'OK')。OK按钮的文字。
        });
        confirmPopup.then(function(res) {
          if(res) {
            $rootScope.isLogin = false;
            $rootScope.img = '';
            window.localStorage.removeItem('username');
            window.localStorage.removeItem('pw');
            window.localStorage.removeItem('userImg');
            window.localStorage.removeItem('carNum');
          } else {
            return 0;
          }
        });
      }
    }
  })
  .controller('feedbackCtrl',function($scope,$state,$ionicPopup){
    $scope.barBack = function(){
      window.history.back();
    };
    $scope.suggestSbu = function(){
      // 一个提示对话框
      $ionicPopup.alert({
        title: "反馈",
        template: '提交成功！'
      });
      // alert('提交成功');
    }
  });



