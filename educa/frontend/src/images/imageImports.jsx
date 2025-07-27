import Redo     from './icons/Redo.png' ;
import Undo     from './icons/Undo.png';
import Relocate from './icons/Relocate.png';
import Plus     from './icons/Plus.png';
import Edit     from './icons/Edit.png';
import Del      from './icons/Del.png';
import Save     from './icons/Save.png';
import AddChild from './icons/AddChild.png';


export const Icons = new class {
    constructor(){
        this.Redo = Redo;
        this.Undo = Undo;
        this.Relocate = Relocate;
        this.Plus = Plus;
        this.Edit = Edit;
        this.Del = Del;
        this.Save = Save;
        this.AddChild = AddChild;
    }
    get(iconName){
        const img = document.createElement('img');
        img.src = this[iconName];

        // document.body.appendChild(img);
    }
    getLink(iconName){
        return this[iconName];
    }
}()

