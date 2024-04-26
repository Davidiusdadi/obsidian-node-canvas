// place files you want to import through the `$lib` alias in this folder.



export function color(cstr?: string){
    if(!cstr)
        // light grey
        return "#D3D3D3";
    switch (cstr) {
        case "1":
            // red
            return "#fa2929";
        case "2":
            // orange
            return "#f1a527";
        case "3":
            // yellow
            return "#eed96a";
        case "4":
            // green
            return "#20f620";
        case "5":
            // cyan
            return "#21eef8";
        case "6":
            // purple
            return "#7723ff";
        default:
            return cstr;

    }
}