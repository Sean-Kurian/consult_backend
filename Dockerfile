# using node image for runtime
FROM node:latest

WORKDIR /consult-backend

# copy package.json into container working dir to do npm install later
# copy source code 
#make sure to have node_modules deleted before you build this or else it will take longer 
COPY . ./

# command triggers while we build the docker image
RUN npm install

# EXPOSE 3000 only for documentation would need to -p 3000:3000 on cli
EXPOSE 5000

# start the application command triggers while we launch the created docker image
CMD ["npm", "start"]