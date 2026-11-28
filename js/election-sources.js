export const ELECTION_SOURCES={
 setn:{sc:'三立新闻网',tc:'三立新聞網',page:'https://elect.setn.com/2026/vote',mayor:true,council:true},
 tvbs:{sc:'TVBS',tc:'TVBS',page:'https://news.tvbs.com.tw/events/2026election/vote',mayor:true,council:true},
 cna:{sc:'中央社',tc:'中央社',page:'https://www.cna.com.tw/news/aipl/202611285003.aspx',mayor:true,council:false},
 ebc:{sc:'东森新闻',tc:'東森新聞',page:'https://news.ebc.net.tw/topic/969',mayor:false,council:false}
};
export function electionSource(value){return Object.hasOwn(ELECTION_SOURCES,value)?value:'setn';}
