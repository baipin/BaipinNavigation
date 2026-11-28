export const ELECTION_SOURCES={
 setn:{sc:'三立新闻网',tc:'三立新聞網',page:'https://elect.setn.com/2026/vote',mayor:true,council:true},
 tvbs:{sc:'TVBS',tc:'TVBS',page:'https://news.tvbs.com.tw/events/2026election/vote',mayor:true,council:true}
};
export function electionSource(value){return Object.hasOwn(ELECTION_SOURCES,value)?value:'setn';}
