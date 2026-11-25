import {api} from '../../services/api';
export type Campaign={announcement:string;headline:string;description:string;imageUrl:string|null;imageAlt:string|null};
export const defaultCampaign:Campaign={announcement:'Discover the LUMIÈRE edit',headline:'A quieter kind of luxury.',description:'Considered essentials. An enduring point of view.',imageUrl:null,imageAlt:null};
export const getCampaign=()=>api<Campaign>('/marketing/campaign');
