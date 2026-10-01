// 生成「总→分」两层总清单：batch/master-plan.json
// Tier A = 34 个省级行政区专题片；Tier B = 333 个地级行政区 + 港澳台城市层
// 生成后 done 字段由 build/ 下是否已出 mp4 自动判定
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

// [省名, 地区, 方言, 主题色, 地级行政区(逗号分隔)]
const P = [
['北京','华北','普通话','berry',''],
['天津','华北','普通话','warm',''],
['河北','华北','普通话','ocean','石家庄,唐山,秦皇岛,邯郸,邢台,保定,张家口,承德,沧州,廊坊,衡水'],
['山西','华北','山西话','grape','太原,大同,阳泉,长治,晋城,朔州,晋中,运城,忻州,临汾,吕梁'],
['内蒙古','华北','普通话','forest','呼和浩特,包头,乌海,赤峰,通辽,鄂尔多斯,呼伦贝尔,巴彦淖尔,乌兰察布,兴安盟,锡林郭勒盟,阿拉善盟'],
['辽宁','东北','东北话','warm','沈阳,大连,鞍山,抚顺,本溪,丹东,锦州,营口,阜新,辽阳,盘锦,铁岭,朝阳,葫芦岛'],
['吉林','东北','东北话','ocean','长春,吉林,四平,辽源,通化,白山,松原,白城,延边'],
['黑龙江','东北','东北话','forest','哈尔滨,齐齐哈尔,鸡西,鹤岗,双鸭山,大庆,伊春,佳木斯,七台河,牡丹江,黑河,绥化,大兴安岭'],
['上海','华东','上海话','berry',''],
['江苏','华东','普通话','warm','南京,无锡,徐州,常州,苏州,南通,连云港,淮安,盐城,扬州,镇江,泰州,宿迁'],
['浙江','华东','上海话','ocean','杭州,宁波,温州,嘉兴,湖州,绍兴,金华,衢州,舟山,台州,丽水'],
['安徽','华东','普通话','forest','合肥,芜湖,蚌埠,淮南,马鞍山,淮北,铜陵,安庆,黄山,阜阳,宿州,滁州,六安,亳州,池州,宣城'],
['福建','华东','闽南话','grape','福州,厦门,莆田,三明,泉州,漳州,南平,龙岩,宁德'],
['江西','华东','江西话','warm','南昌,景德镇,萍乡,九江,新余,鹰潭,赣州,吉安,宜春,抚州,上饶'],
['山东','华东','山东话','berry','济南,青岛,淄博,枣庄,东营,烟台,潍坊,济宁,泰安,威海,日照,临沂,德州,聊城,滨州,菏泽'],
['河南','华中','河南话','berry','郑州,开封,洛阳,平顶山,安阳,鹤壁,新乡,焦作,濮阳,许昌,漯河,三门峡,南阳,商丘,信阳,周口,驻马店'],
['湖北','华中','湖北话','ocean','武汉,黄石,十堰,宜昌,襄阳,鄂州,荆门,孝感,荆州,黄冈,咸宁,随州,恩施'],
['湖南','华中','湖南话','grape','长沙,株洲,湘潭,衡阳,邵阳,岳阳,常德,张家界,益阳,郴州,永州,怀化,娄底,湘西'],
['广东','华南','粤语','warm','广州,深圳,珠海,汕头,佛山,韶关,湛江,肇庆,江门,茂名,惠州,梅州,汕尾,河源,阳江,清远,东莞,中山,潮州,揭阳,云浮'],
['广西','华南','粤语','forest','南宁,柳州,桂林,梧州,北海,防城港,钦州,贵港,玉林,百色,贺州,河池,来宾,崇左'],
['海南','华南','普通话','ocean','海口,三亚,三沙,儋州'],
['重庆','西南','四川话','berry',''],
['四川','西南','四川话','grape','成都,自贡,攀枝花,泸州,德阳,绵阳,广元,遂宁,内江,乐山,南充,眉山,宜宾,广安,达州,雅安,巴中,资阳,阿坝,甘孜,凉山'],
['贵州','西南','贵州话','forest','贵阳,六盘水,遵义,安顺,毕节,铜仁,黔西南,黔东南,黔南'],
['云南','西南','云南话','warm','昆明,曲靖,玉溪,保山,昭通,丽江,普洱,临沧,楚雄,红河,文山,西双版纳,大理,德宏,怒江,迪庆'],
['西藏','西南','普通话','ocean','拉萨,日喀则,昌都,林芝,山南,那曲,阿里'],
['陕西','西北','陕西话','berry','西安,铜川,宝鸡,咸阳,渭南,延安,汉中,榆林,安康,商洛'],
['甘肃','西北','陕西话','warm','兰州,嘉峪关,金昌,白银,天水,武威,张掖,平凉,酒泉,庆阳,定西,陇南,临夏,甘南'],
['青海','西北','陕西话','ocean','西宁,海东,海北,黄南,海南,果洛,玉树,海西'],
['宁夏','西北','陕西话','grape','银川,石嘴山,吴忠,固原,中卫'],
['新疆','西北','陕西话','forest','乌鲁木齐,克拉玛依,吐鲁番,哈密,昌吉,博尔塔拉,巴音郭楞,阿克苏,克孜勒苏,喀什,和田,伊犁,塔城,阿勒泰'],
['香港','港澳台','粤语','berry',''],
['澳门','港澳台','粤语','warm',''],
['台湾','港澳台','普通话','ocean','台北,高雄,台中,台南,基隆,新竹,嘉义'],
];

// 已出片判定
const doneSet = new Set();
const buildDir = path.join(ROOT, 'build');
if (fs.existsSync(buildDir)) {
  for (const d of fs.readdirSync(buildDir)) {
    if (!d.startsWith('旅游-')) continue;
    const od = path.join(buildDir, d, 'outputs');
    if (fs.existsSync(od) && fs.readdirSync(od).some(f => f.endsWith('.mp4'))) {
      doneSet.add(d.replace(/^旅游-/, ''));
    }
  }
}

const out = [];
for (const [prov, region, dialect, theme, cities] of P) {
  const pname = (prov === '香港' || prov === '澳门' || prov === '台湾' || prov === '北京' || prov === '天津' || prov === '上海' || prov === '重庆')
    ? prov : prov; // 省级专题统一用「XX省/市」在生成时处理，这里先存省名
  // 省级专题目录名可能是「河南省」这类带后缀的写法
  const pDone = doneSet.has(prov) || doneSet.has(prov + '省') || doneSet.has(prov + '自治区')
    || doneSet.has(prov + '特别行政区') || doneSet.has(prov + '市');
  out.push({ level: 'province', name: prov, prov, region, dialect, theme, done: pDone });
  if (cities) {
    for (const c of cities.split(',').map(s => s.trim()).filter(Boolean)) {
      out.push({ level: 'city', name: c, prov, region, dialect, theme, done: doneSet.has(c) });
    }
  }
}
// 直辖市/特区没有下辖区，但台湾省下列了城市层

const jPath = path.join(__dirname, 'master-plan.json');
fs.writeFileSync(jPath, JSON.stringify(out, null, 1), 'utf8');

const A = out.filter(x => x.level === 'province');
const B = out.filter(x => x.level === 'city');
console.log(`Tier A 省级专题: ${A.length}  已完成 ${A.filter(x=>x.done).length}`);
console.log(`Tier B 地级/城市: ${B.length}  已完成 ${B.filter(x=>x.done).length}`);
console.log(`合计 ${out.length}，已完成 ${out.filter(x=>x.done).length}`);
console.log('已出片:', [...doneSet].join(' '));
console.log('写入', jPath);
