import {Component,ViewChildren} from '@angular/core';
import {NavController, ToastController, LoadingController, FabContainer,AlertController} from 'ionic-angular';
import { BLE } from '@ionic-native/ble';


@Component({
  selector: 'page-home',
  templateUrl: 'home.html'
})
export class HomePage {
    @ViewChildren ('rssi_img') img:any;
    device_name: string;     //蓝牙地址
    output: any;           //返回值
    isConnect: boolean = false;
    isOutput: boolean = false;
    device_list: any[] = [];
    device_rssi: any[] = [];
    serviceId:string;
    service_uuid_write:string;      //
    characteristic_uuid_write:string;
    service_uuid_notify:string;
    characteristic_uuid_notify:string;
    send_shake_instruction:any;     //震动指令
    send_instruction:any;      //计步指令
    JSON: any;


    constructor(public navCtrl: NavController,
                private BLE:BLE,
                public toastCtrl: ToastController,
                public loadingCtrl: LoadingController,
                public alertCtrl: AlertController,
    ) {}
    
    //发送指令成功
    send_instruction_success(){
        const success = this.toastCtrl.create({
            message: '指令发送成功',
            duration: 3000,
            position: 'top'
        })
        success.present();
    };

    //发送指令失败
    send_instruction_fail(){
        const fail = this.toastCtrl.create({
            message: '指令发送失败！请重试',
            duration: 3000,
            position: 'top'
        })
        fail.present();
    }

    //判断是否连接到蓝牙
    isConnect_BLE(){
        this.BLE.isConnected(this.serviceId).then(res=>{
            return true;
        }).catch(err=>{
            const no_connect = this.toastCtrl.create({
                 message: '蓝牙未连接，请先连接蓝牙',
                duration: 3000,
                position: 'top'
            })
            no_connect.present();
            return false;
        })
    }

    //扫描蓝牙
    start_scan(){
        //this.device_list.push(this.JSON);
        this.BLE.isEnabled().then(res=>{
            //开始搜索前清空内容，断开上次连接
            this.device_list = [];
            this.BLE.disconnect(this.serviceId);
            this.isConnect = false;
            this.isOutput = false;
            let loader = this.loadingCtrl.create({
                content:'正在搜索，稍安勿躁...',
                duration:3000
            });
            loader.present();
            setTimeout(() =>{
                loader.dismiss();
            },3000);

            this.BLE.scan([],5).subscribe(device => {
                this.device_list.push(device);
                this.sortNumber(this.device_list);     //排序
                this.unique(this.device_list);         //去重
                for(var i=0;i<this.img._results.length;i++){
                    if(this.img._results[i].nativeElement.name >= -60){
                        this.img._results[i].nativeElement.src = 'assets/img/icon_signal_4@2x.png'
                    }
                    else{
                        this.img._results[i].nativeElement.src = 'assets/img/icon_signal_2@2x.png'
                    }
                }
            }, error => {
                alert('扫描发生错误：'+ error);
            });
        }).catch(err=>{
            const isEnale_toast = this.toastCtrl.create({
              message: '检测到蓝牙未打开',
              duration: 3000,
              position: 'top'
            })
            isEnale_toast.present();

            this.BLE.enable().then(res=>{
                const enable_toast = this.toastCtrl.create({
                    message: '您的蓝牙已打开',
                    duration: 3000,
                    position: 'top'
                });
              enable_toast.present();
            }).catch(err=>{
                const enable_err_toast = this.toastCtrl.create({
                    message: '您的蓝牙打开失败！请重试',
                    duration: 3000,
                    position: 'top'
                });
                enable_err_toast.present();
            })
        })
    }

    //连接蓝牙
    connect($event){
        const hold_connect_toast = this.toastCtrl.create({
          message: '连接需要几秒钟时间，请耐心等候或者重新连接',
          duration: 3000,
          position: 'top'
        })
        hold_connect_toast.present();
        this.BLE.connect($event.srcElement.parentElement.id).subscribe(res =>{
            if(res){
                this.isConnect = true;
                this.device_name = '已经连接到' + $event.srcElement.parentElement.name + '：' + $event.srcElement.parentElement.id;
                this.serviceId = $event.srcElement.parentElement.id;
                this.serviceId;
                this.service_uuid_write = res.characteristics[6].service;
                this.characteristic_uuid_write = res.characteristics[6].characteristic;
                this.service_uuid_notify = res.characteristics[5].service;
                this.characteristic_uuid_notify = res.characteristics[5].characteristic;
            }
        },err => {
            const connect_toast = this.toastCtrl.create({
                message: '没有连接上设备',
                duration: 3000,
                position: 'top'
            })
            connect_toast.present();
        })
    }

    //发送震动指令
    send_vibration(fab:FabContainer){
        fab.close();
        this.send_shake_instruction = new Uint8Array(7);
        this.send_shake_instruction[0] = 0xAA;
        this.send_shake_instruction[1] = 0x55;
        this.send_shake_instruction[2] = 0x03;
        this.send_shake_instruction[3] = 0x05;
        this.send_shake_instruction[4] = 0x01;
        this.send_shake_instruction[5] = 0x03;
        this.send_shake_instruction[6] = 0x09;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_shake_instruction.buffer).then(res=>{
            this.send_instruction_success();
        }).catch(err=>{
            this.send_instruction_fail();
        });
    }

    //发送计步指令
    send_step(fab:FabContainer){
        fab.close();
        this.send_instruction = new Uint8Array(6);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x02;
        this.send_instruction[3] = 0x02;
        this.send_instruction[4] = 0x01;
        this.send_instruction[5] = 0x03;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                this.isOutput = true;
                this.output = this.step_bytesToString(res) + '步';
            },err=>{
                this.send_instruction_fail();
            })
        })
    }

    //发送历史数据指令
    send_history(fab:FabContainer){
        fab.close();
        this.send_instruction = new Uint8Array(6);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x02;
        this.send_instruction[3] = 0x02;
        this.send_instruction[4] = 0x05;
        this.send_instruction[5] = 0x07;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                  this.isOutput = true;
                  this.output = this.history_bytesToString(res);
              },err=>{
                  this.send_instruction_fail();
              })
        })
    }


    //发送电量指令
    send_battery(fab:FabContainer){
        fab.close();
        this.send_instruction = new Uint8Array(6);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x02;
        this.send_instruction[3] = 0x05;
        this.send_instruction[4] = 0x04;
        this.send_instruction[5] = 0x09;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                  this.isOutput = true;
                  this.output = this.battery_bytesToString(res);
              },err=>{
                  this.send_instruction_fail();
              })
        })
    }

    //自定义指令
    self_set(fab:FabContainer){
        fab.close();
        const set = this.alertCtrl.create({
            title: '自定义指令',
            inputs: [{
                name: 'order',
                placeholder: '请输入你要发送的指令',
            }],
            buttons: [{
                text: '取消',
                role: 'cancel',
            },
            {
                text: '确定',
                handler: data =>{
                    if(data.order){
                        let length = data.order.length / 2;
                        let order_arr = [];
                        this.send_instruction = new Uint8Array(length);
                        for(let i = 0; i < data.order.length; i = i + 2){
                            order_arr.push(data.order.substring(i,i+2));
                        };
                        for(let i = 0; i < order_arr.length; i++){
                            this.send_instruction[i] = '0x' + order_arr[i];
                        };
                        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
                            this.send_instruction_success();
                            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                                this.isOutput = true;
                                this.output = this.bytesToString(res);
                            },err=>{
                                this.send_instruction_fail();
                            })
                        })
                    }else{
                        return false;
                    }
                }
            }]
        });
        set.present();
    }

    //获取版本号
    send_version(fab:FabContainer){
        fab.close();
        this.send_instruction = new Uint8Array(6);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x02;
        this.send_instruction[3] = 0x08;
        this.send_instruction[4] = 0x01;
        this.send_instruction[5] = 0x09;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                this.isOutput = true;
                this.output = '版本号：' + this.version_bytesToString(res)
            },err => {
                this.send_instruction_fail();
            })
        })
    }

    //断开蓝牙连接
    disconnect(){
        this.BLE.disconnect(this.serviceId).then(res=>{
            const dis_toast = this.toastCtrl.create({
                message: '连接已断开',
                duration: 3000,
                position: 'top'
            })
            dis_toast.present();
            this.isConnect = false;
            this.isOutput = false;
        }).catch(err=>{
            const dis_err_toast = this.toastCtrl.create({
                message: '断开失败！重新开始搜索或断开蓝牙',
                duration: 3000,
                position: 'top'
            })
            dis_err_toast.present();
        });
    }


    //指令切换
    order(fab_test:FabContainer){
        fab_test.close();
    }

    test(fab:FabContainer){
        fab.close();
    }





    /*测试指令发送处*/

    //强制重启
    restart(fabtest:FabContainer){
        fabtest.close();
        this.send_instruction = new Uint8Array(7);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x03;
        this.send_instruction[3] = 0x07;
        this.send_instruction[4] = 0x04;
        this.send_instruction[5] = 0x01;
        this.send_instruction[6] = 0x0C;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                this.send_instruction_success();
            },err=>{
                this.send_instruction_fail();
            })
        })
    }

    //阿波罗重启次数
    restart_times(fab_test:FabContainer){
        fab_test.close();
        this.send_instruction = new Uint8Array(67);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x03;
        this.send_instruction[3] = 0x07;
        this.send_instruction[4] = 0x04;
        this.send_instruction[5] = 0x02;
        this.send_instruction[6] = 0x0D;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                this.isOutput = true;
                this.output = this.bytesToString(res)
            },err=>{
                this.send_instruction_fail();
            })
        })
    }


    //初始化状态
     init(fab_test:FabContainer){
        fab_test.close();
        this.send_instruction = new Uint8Array(7);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x03;
        this.send_instruction[3] = 0x07;
        this.send_instruction[4] = 0x04;
        this.send_instruction[5] = 0x03;
        this.send_instruction[6] = 0x0E;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                this.isOutput = true;
                this.output = this.Rcount_bytesToString(res)
            },err=>{
                this.send_instruction_fail();
            })
        })
    }


    //系统时间
    system_time(fab_test:FabContainer){
        fab_test.close();
        this.send_instruction = new Uint8Array(7);
        this.send_instruction[0] = 0xAA;
        this.send_instruction[1] = 0x55;
        this.send_instruction[2] = 0x03;
        this.send_instruction[3] = 0x07;
        this.send_instruction[4] = 0x04;
        this.send_instruction[5] = 0x04;
        this.send_instruction[6] = 0x0F;
        this.BLE.writeWithoutResponse(this.serviceId,this.service_uuid_write,this.characteristic_uuid_write,this.send_instruction.buffer).then(res=>{
            this.send_instruction_success();
            this.BLE.startNotification(this.serviceId,this.service_uuid_notify,this.characteristic_uuid_notify).subscribe(res=>{
                this.isOutput = true;
                this.output = this.time_bytesToString(res)
            },err=>{
                this.send_instruction_fail();
            })
        })
    }


  //步数返回数据处理
    step_bytesToString(buffer){
       let arr = new Uint8Array(buffer);
       return parseInt(arr[8].toString() + arr[7].toString() + arr[6].toString() + arr[5].toString());
    }

    //历史数据返回处理
    history_bytesToString(buffer){
        let arr = new Uint8Array(buffer);
        if(arr.length > 8){
            let type;
            switch (arr[5]){
                case 0: type = 'notype';
                    break;
                case 1: type = 'walk';
                    break;
                case 2: type = 'run';
                    break;
                case 3: type = 'sleep';
                    break;
                case 4: type = 'heartbaet';
                    break;
                case 5: type = 'swim';
                    break;
                case 6: type = 'run_walk';
                    break;
                case 7: type = 'daily_sit_walk';
                    break;
                case 8: type = 'rest';
                    break;
                case 9: type = 'stationary';
                    break;
          };
          let date = arr[6].toString() + '月' + arr[7].toString() + '日';
          let time = arr[8].toString() + '：' + arr[9].toString();
          let state;
          switch (arr[10]){
              case 16: state = 'wakeup';
                  break;
              case 32: state = 'light';
                  break;
              case 48: state = 'middle';
                  break;
              case 64: state = 'deep';
                  break;
              case 224: state = 'start';
                  break;
              case 240: state = 'end';
                  break;
          }
          let step = arr[12].toString() + arr[11].toString() + '步'
          return date  + time + ',' + type + ',' + state + ',' + step;
        }
        else{
            return '暂时没有历史数据'
        }
    }

    //电量数据返回处理
    battery_bytesToString(buffer){
        let arr = new Uint8Array(buffer);
        let present = '电量：' + arr[5].toString() + '%';
        return present;
    }

    //版本号数据返回处理
    version_bytesToString(buffer){
        let arr = new Uint8Array(buffer);
        return arr[5].toString() + '.' + arr[6].toString() + '.' + arr[7].toString() + '.' +arr[8].toString();
    }

    //系统时间数据返回处理
    time_bytesToString(buffer){
        let arr = new Uint8Array(buffer);
        return arr[7] + '月' + '周' + arr[8] + ',' + arr[9].toString() + '日' + arr[10].toString() + '时' + arr[11].toString() + '分' + arr[12].toString() + '秒';
    }

    //重启次数数据返回处理
    Rcount_bytesToString(buffer){
        let arr = new Uint8Array(buffer);
        let restart = '';
        if(arr[6] == 1){
           restart = '初始化成功'
        }
        if(arr[6] == 0) {
           restart = '初始化失败'
        }else{
           restart = '初始化状态：' + arr[6].toString();
        }
        return restart + ',' + '小指针：' + arr[8].toString() + arr[7].toString() + ',时针：' + arr[9].toString() + ',分针：' + arr[10].toString();
    }

    //自定义
    bytesToString(buffer){
        return new Uint8Array(buffer);
    }

  //冒泡排序算法
    sortNumber(arr){
        for(var i=0;i<arr.length-1;i++){
            for(var j=0;j<arr.length-i-1;j++){
                if(arr[j].rssi < arr[j+1].rssi){
                    var temp = arr[j];
                    arr[j] = arr[j+1];
                    arr[j+1] = temp;
                }
            }
        }
        return arr;
    }

    //数组去重  并筛选掉信号差的蓝牙信号
    unique(arr){
        var newarr = [];
        var screen_arr = [];
        for(var i=0;i<arr.length;i++){
            if(newarr.indexOf(arr[i].id) == -1 && arr[i].rssi > -80){
                newarr.push(arr[i].id);
                screen_arr.push(arr[i]);
            }
        }
        return screen_arr;
    }
}
