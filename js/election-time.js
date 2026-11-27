// All election boundaries are explicit Taipei time, independent of the viewer's timezone.
export const ELECTION_EVENT={id:'tw-local-2026',date:'2026-11-28',opens:'2026-11-28T08:00:00+08:00',closes:'2026-11-28T16:00:00+08:00',ends:'2026-11-30T00:00:00+08:00',source:'https://info.cec.gov.tw/vote2026/'};
export function electionPhase(now=Date.now()){return now<Date.parse(ELECTION_EVENT.opens)?'upcoming':now<Date.parse(ELECTION_EVENT.closes)?'voting':now<Date.parse(ELECTION_EVENT.ends)?'counting':'ended';}
export function electionVisible(now=Date.now()){return now>=Date.parse('2026-11-28T00:00:00+08:00')&&now<Date.parse(ELECTION_EVENT.ends);}
