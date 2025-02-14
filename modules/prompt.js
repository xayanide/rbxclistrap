import * as nodeProcess from "node:process";
import * as nodeReadline from "node:readline";

const createPrompt = (query) => {
    return new Promise((resolve) => {
        const readlineInterface = nodeReadline.createInterface({ input: nodeProcess.stdin, output: nodeProcess.stdout });
        readlineInterface.question(query, (answer) => {
            readlineInterface.close();
            resolve(answer);
        });
    });
};

export { createPrompt };
