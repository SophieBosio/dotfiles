export default async function unreachableCode() {
  return 10;
}

const age = 27;
const myObj = {
  prop: 12,
  nested: {
    prop: 100
  },
  initialAge: age,
  age,
}


const age = 100;

const sandrico = {
  age: 27,
  name: `sandrico`
}

console.log(sandrico.cool);
console.log(sandrico.cool);

console.log(sandrico.age);
console.log(sandrico.doesNotExist);


const usedAge = 27;
console.log(usedAge);
